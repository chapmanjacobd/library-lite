
import alasql from 'alasql';
import Alpine from 'alpinejs';
import LiteYTEmbed from 'lite-youtube-embed';
import 'lite-youtube-embed/src/lite-yt-embed.css';
import 'material-symbols/rounded.css';
import './style.css';
import { Playlist } from './types';
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
window.LiteYTEmbed = LiteYTEmbed

Alpine.store('playlists', [])
Alpine.store('entries', [])
Alpine.store('sett', { showOnlyPlaylists: false, hideWatched: true, maxEntriesVisiblePerPlaylist: 10_000 })

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
  parseYTid: function (url: string) {
    let urla = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return undefined !== urla[2] ? urla[2].split(/[^0-9a-z_\-]/i)[0] : urla[0];
  },
  loadYT: function (url: string, start: number, end: number) {
    let videoid = app.parseYTid(url)
    return `<iframe id='ytplayer' type='text/html' width='100%' height='100%' src='https://www.youtube.com/embed/${videoid}?version=3&loop=1&playlist=${videoid}&autoplay=1&rel=0&start=${start}&end=${end}&hl=en&cc_load_policy=1&cc_lang_pref=en&cc=1&hd=1&iv_load_policy=3&origin=https://www.unli.xyz' frameborder='0'
  allowfullscreen="allowfullscreen" mozallowfullscreen="mozallowfullscreen" msallowfullscreen="msallowfullscreen" oallowfullscreen="oallowfullscreen" allowscriptaccess="always" webkitallowfullscreen="webkitallowfullscreen"></iframe>`;
  },
  loadYTlazy: function (url: string, playlabel: string, start: number = 0, end: number = 0) {
    let videoid = app.parseYTid(url)
    return `<lite-youtube id='ytplayer' width='100%' height='100%' videoid='${videoid}' playlabel='${playlabel}' params='version=3&playlist=${videoid}&rel=0&start=${start}${end > 0 ? '&end=' + end : ''}&hl=en&cc_load_policy=1&cc_lang_pref=en&cc=1&hd=1&iv_load_policy=3&origin=https://www.unli.xyz'></lite-youtube>`
  },
  ytValidId: function (url: string) {
    if (!url) return false;
    return url != "" && !app.parseYTid(url).includes("search");
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
    // if (Alpine.store('sett').hideWatched) constraints.push('entries->')
    const where = constraints.length > 0 ? 'where' + constraints.join(' and ') : ''

    const entries = alasql('select * from entries' + where) // + ' limit ' + Alpine.store('sett').maxEntriesVisiblePerPlaylist

    const playlists = alasql(`select playlists.*, sum(entries.duration) duration from playlists
      join entries on entries.playlist_url = playlists.playlist_url
      where entries.id not in (select id from watched) ${where}
      group by playlists.playlist_url
    `)
    Alpine.store('playlists', playlists) // thanks @stackoverflow:Dauros

    Alpine.store('entries', entries)

    Alpine.store('videoqty', alasql('select value count(distinct id) from entries' + where))

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
  renderPlaylists: function () {
    const tableHead = html`<thead>
  <tr>
    <td colspan="100">
      <template x-if="$store.playlists.length > 0">
        <div><span>Playlists</span><span x-text="' ('+ $store.playlists.length +')'"></span></div>
      </template>
      <template x-if="$store.playlists.length == 0">
        <div>Add a playlist or channel URL to get started</div>
      </template>
    </td>
  </tr>
  <tr>
    <td></td>
  </tr>
</thead>`

    const playlistRow = html`<tr>
  <td colspan="2"><a :href="pl.webpage_url" x-text="pl.title"></a></td>
  <td colspan="1"><a :href="pl.channel_url" x-text="pl.uploader"></a></td>
  <td colspan="2">
    <p x-text="
          (pl.playlist_count - $store.entries.length) + ' of '+ pl.playlist_count + ' watched ('
        + (pl.playlist_count - $store.entries.length) / pl.playlist_count * 100.0 + '%); '
        + app.secondsToFriendlyTime(pl.duration) + ' remaining'
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

    return `<table>
  ${tableHead}
  <tbody>
    <template x-for="(pl, pindex) in $store.playlists" :key="pindex">
      ${playlistRow}
    </template>
  </tbody>
  ${tableFoot}
</table>`
  },
  renderEntrees: function () {
    const tableHead = html`<thead>
  <tr>
    <td colspan="100">
      <template x-if="$store.entries.length > 0">
        <div style="display:flex;justify-content: space-between;">
          <span x-text="'Videos ('+ $store.entries.length +')'"></span>
          <span
            x-text="'Total runtime: '+ app.secondsToFriendlyTime($store.entries.reduce((p,x) => p + x.duration, 0))"></span>
        </div>
      </template>
    </td>
  </tr>
  <tr>
    <td></td>
  </tr>
</thead>`

    const videoRow = html`<tr>
  <td>
    <template x-if="v.ie_key == 'Youtube'">
      <span class="material-symbols-rounded">play_circle</span>
    </template>
  </td>
  <td><span x-text="v.title"></span></td>
  <td><span x-text="v.uploader"></span></td>
  <td>
    <span x-text="app.secondsToFriendlyTime(v.duration)"></span>
    <input type="checkbox" :checked="app.isVideoWatched(v)"
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
    <template x-if="!$store.sett.showOnlyPlaylists">
      <template x-for="(v, vindex) in $store.entries" :key="vindex">
        ${videoRow}
      </template>
    </template>
  </tbody>
  ${tableFoot}
</table>`
  }
}

if (devMode) {
  await app.fetchPlaylist('https://www.youtube.com/playlist?list=PL8A83124F1D79BD4F')
  await app.fetchPlaylist('https://www.youtube.com/playlist?list=PLAskVVPnzWMBa_Jw9IbCm_uyjI8oawr-W')
}

Alpine.start()
app.updateView()


// if (!devMode && Math.random() < 0.05) fullstory();
