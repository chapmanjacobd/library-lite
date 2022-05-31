
import alasql from 'alasql';
import Alpine from 'alpinejs';
import 'material-symbols/rounded.css';
import { loadYT } from './players';
import './style.css';
import { Entree, Playlist } from './types';
import { html } from './utils';

const devMode = window.location.hostname == 'localhost' || "127.0.0.1";

if (devMode) {
  import.meta.hot
}

let API_domain = "https://unli.xyz/api/yt/v1";
if (devMode) API_domain = "http://127.0.0.1:8000/v1";

alasql('CREATE localStorage DATABASE IF NOT EXISTS RuntimeDB')
alasql('ATTACH localStorage DATABASE RuntimeDB')
// if (!devMode)
alasql('USE RuntimeDB')
alasql('SET AUTOCOMMIT ON')
alasql('CREATE TABLE IF NOT EXISTS playlists');
alasql('CREATE TABLE IF NOT EXISTS entries');
alasql('CREATE TABLE IF NOT EXISTS watched');

window.alasql = alasql
window.Alpine = Alpine

Alpine.store('playlists', [])
Alpine.store('entries', [])
Alpine.store('sett', { hideWatched: true, maxEntriesVisiblePerPlaylist: 10_000, compact: true, selectedVideo: {} })

window.app = {
  fetchPlaylist: async function (playlist: string) {
    if (playlist.length < 5) return;

    console.log('fetching new playlist');

    await fetch(`${API_domain}?playlist=` + playlist)
      .then(response => response.json())
      .then((data: Playlist) => {
        // alasql('ATTACH localStorage DATABASE RuntimeDB')
        // alasql('SET AUTOCOMMIT ON')

        data.playlist_url = playlist
        data.duration = data.entries!.reduce((p, x) => p + x.duration, 0)
        data.entries = data.entries!.map((x) => ({
          ...x, playlist_url: playlist
        }));
        alasql('DELETE from entries where playlist_url = ?', playlist)
        alasql('INSERT INTO entries SELECT * FROM ?', [data.entries])

        delete data.entries
        alasql('DELETE from playlists where webpage_url = ?', data.webpage_url)
        alasql('INSERT INTO playlists SELECT * FROM ?', [[data]])
        app.updateView()
      })
  },
  secondsToFriendlyTime: function (seconds: number) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);

    let display = [];
    if (d > 0) display.push(d + ' d')
    if (h > 0) display.push(h + ' h')
    if (m > 0) display.push(m + ' m')

    return display.join(', ');
  },
  view: {},
  updateView: function () {
    let constraints: string[] = []
    if (Alpine.store('sett').hideWatched) constraints.push('entries.id not in (select id from watched)')

    constraints.push('title != "[Deleted video]"')

    const where = constraints.length > 0 ? 'where ' + constraints.join(' and ') : ''
    const limit = ' limit ' + Alpine.store('sett').maxEntriesVisiblePerPlaylist

    const entries = alasql(`select entries.*, watched.id IS NOT NULL as watched from entries
      outer join watched on watched.id = entries.id and watched.ie_key = entries.ie_key
      ${where}
    `)

    const playlists = alasql(`select playlists.*, sum(entries.duration) duration from playlists
      join entries on entries.playlist_url = playlists.playlist_url
      ${where}
      group by playlists.playlist_url
    `)
    Alpine.store('playlists', playlists) // thanks @stackoverflow:Dauros
    Alpine.store('entries', entries)
  },
  isVideoWatched: function (v: { ie_key: string; id: string; }) {
    return alasql('select value FROM watched where ie_key=? and id=?', [v.ie_key, v.id])?.length > 0
  },
  markVideoWatched: function (v: { ie_key: string; id: string; }) {
    return alasql('INSERT INTO watched SELECT * FROM ?', [[{ ie_key: v.ie_key, id: v.id }]])
  },
  markVideoUnwatched: function (v: { ie_key: string; id: string; }) {
    return alasql('DELETE FROM watched where ie_key=? and id=?', [v.ie_key, v.id])
  },
  renderVideo: function (v: Entree) {
    function wrapPlayer(player: string) {
      return `<div style="height:50vh">${player}</div>`
    }
    if (v.ie_key == 'Youtube') return wrapPlayer(loadYT(v.url))
    return html``
  },
  renderPlaylists: function () {
    const tableHead = html`<thead>
  <tr>
    <td colspan="100">
      <div><span>Playlists</span><span x-text="' ('+ $store.playlists.length +')'"></span></div>
    </td>
  </tr>
</thead>`

    const playlistRow = html`<tr>
  <td><a :href="pl.webpage_url" x-text="pl.title"></a></td>
  <td><a :href="pl.channel_url" x-text="pl.uploader"></a></td>
  <td>
    <p x-text="
          (pl.playlist_count - $store.entries.filter(x=> x.playlist_url == pl.playlist_url).length) + ' of '+ pl.playlist_count + ' watched ('
        + Math.round((pl.playlist_count - $store.entries.filter(x=> x.playlist_url == pl.playlist_url).length) / pl.playlist_count) * 100.0 + '%); '
        + app.secondsToFriendlyTime(pl.duration) + ' ' + ($store.sett.hideWatched ? 'remaining' : 'total')
      "></p>
  </td>
</tr>`

    const tableFoot = html`<template x-if="$store.playlists > 0">
  <tfoot>
    <tr>
      <td colspan="100">
        <div style="display: flex; justify-content: space-between; margin: 0 .5rem;"></div>
      </td>
    </tr>

  </tfoot>
</template>`
    const sumPlaylistCount = alasql('select value sum(playlist_count) from playlists')
    return `<table>
  ${tableHead}
  <tbody>
  <tr>
    <td colspan="2">Total</td>
    <td>
      <p x-text="
            (${sumPlaylistCount} - $store.entries.length) + ' of '+ ${sumPlaylistCount} + ' watched ('
          + Math.round(((${sumPlaylistCount} - $store.entries.length) / ${sumPlaylistCount})) * 100.0 + '%); '
          + app.secondsToFriendlyTime($store.entries.reduce((p,x) => p + x.duration, 0)) + ' ' + ($store.sett.hideWatched ? 'remaining' : 'total')
        "></p>
    </td>
  </tr>
    <template x-for="(pl, pindex) in $store.playlists" :key="pindex">
      ${playlistRow}
    </template>
  </tbody>
  ${tableFoot}
</table>`
  },
  renderEntrees: function () {
    const countWatched = alasql('select value count(distinct id) from watched')

    const tableHead = `<thead>
  <tr>
    <td colspan="100">
      <template x-if="$store.entries.length > 0">
        <div style="display:flex;justify-content: space-between;">
          <span
            x-text="'Videos ('+ $store.entries.length + ($store.sett.hideWatched && ${countWatched} > 0 ? '; ' + ${countWatched} + ' hidden watched videos' : '') +')'"></span>
        </div>
      </template>
    </td>
  </tr>
</thead>`

    const videoRow = html`<tr>
  <td>
    <span @click="$store.sett.selectedVideo=v" style="cursor: pointer;"
      class="material-symbols-rounded">play_circle</span>
  </td>
  <td><span x-text="v.title" :title="v.title"></span></td>
  <td><span x-text="v.uploader"></span></td>
  <td>
    <span x-text="app.secondsToFriendlyTime(v.duration)"></span>
    <input type="checkbox" :checked="v.watched"
      @click="$el.checked ? app.markVideoWatched(v) : app.markVideoUnwatched(v)">
    <label>Watched?</label>
  </td>
  <td><a :href="v.url" target="_blank">🔗</a></td>
</tr>`

    const tableFoot = html`<template x-if="$store.playlists > 0">
  <tfoot>
    <tr>
      <td colspan="100">
        <div style="display: flex; justify-content: space-between; margin: 0 .5rem;"></div>
      </td>
    </tr>

  </tfoot>
</template>`

    return `<table>
  ${tableHead}
  <tbody>
    <template x-for="(v, vindex) in $store.entries" :key="vindex">
      ${videoRow}
    </template>
  </tbody>
  ${tableFoot}
</table>`
  },
  randimal: function () {
    return [
      "🌸",
      "🐄",
      "🐉",
      "🐋",
      "🐕‍🦺",
      "🐘",
      "🐙",
      "🐠",
      "🐢",
      "🐬",
      "🐳",
      "🐸",
      "🐹",
      "💐",
      "💮",
      "🕊️",
      "🙈",
      "🙉",
      "🙊",
      "🦅",
      "🦆",
      "🦈",
      "🦋",
      "🦎",
      "🦐",
      "🦓",
      "🦖",
      "🦗",
      "🦘",
      "🦚",
      "🦜",
      "🦞",
      "🦢",
      "🦧",
      "🦩",
    ].random();
  },
  onomonopia: function () {
    return [
      "ahem",
      "ahhh",
      "arf.",
      "argh",
      "arr!",
      "baa.",
      "bah.",
      "bark",
      "beep",
      "beoi",
      "bleh",
      "blet",
      "bonk",
      "boom",
      "burp",
      "chir",
      "chow",
      "clik",
      "eaar",
      "eek!",
      "eep.",
      "grol",
      "grr.",
      "hewo",
      "hun.",
      "kerh",
      "kroo",
      "lah.",
      "loow",
      "meow",
      "mew.",
      "moo.",
      "oink",
      "oweh",
      "phew",
      "psst",
      "purr",
      "rats",
      "rawr",
      "roar",
      "sigh",
      "slam",
      "sqak",
      "ssss",
      "toot",
      "tsk.",
      "ugh.",
      "umm.",
      "uuk.",
      "vrüm",
      "vwop",
      "wee.",
      "woof",
      "wow~",
      'yarr',
      "yip.",
      "zip.",
      "zonk",
    ].random();
  }
}

if (devMode) {
  await app.fetchPlaylist('https://www.youtube.com/playlist?list=PL8A83124F1D79BD4F')
  await app.fetchPlaylist('https://www.youtube.com/playlist?list=PLAskVVPnzWMBa_Jw9IbCm_uyjI8oawr-W')
}

Alpine.start()
app.updateView()


// if (!devMode && Math.random() < 0.05) fullstory();
