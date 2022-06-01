
import alasql from 'alasql';
import Alpine from 'alpinejs';
import 'material-symbols/rounded.css';
import { vimeo, youtube } from './players';
import './style.css';
import { Entree, Playlist } from './types';
import { downloadObjectAsJson, fileToJSON, html, onomonopia, randimal, randomPASTEL, secondsToFriendlyTime } from './utils';

const devMode = window.location.hostname == 'localhost';

function changeTheBackgroundColor() {
  window.htmlroot.style.background = randomPASTEL((Math.random() + 1).toString(36).substring(7))
}
changeTheBackgroundColor()

if (devMode) {
  import.meta.hot
}

let API_domain = "https://unli.xyz/api/yt/v1";
if (devMode) API_domain = "http://127.0.0.1:8000/v1";

window.alasql = alasql
window.Alpine = Alpine

Alpine.store('playlists', [])
Alpine.store('entries', [])
Alpine.store('sett', {
  hideWatched: true,
  entriesOrderBy: 'random()',
  entriesLimit: '', compact: true, selectedVideo: {},
  automark: true, autoplay: false, wadsworth: false
})

window.app = {
  randomPASTEL, changeTheBackgroundColor, secondsToFriendlyTime,
  fetchPlaylist: async function (playlist: string) {
    if (playlist.length < 5) return;

    await fetch(`${API_domain}?playlist=` + playlist)
      .then(response => response.json())
      .then((data: Playlist) => {
        // alasql('ATTACH localStorage DATABASE RuntimeDB')
        // alasql('SET AUTOCOMMIT ON')

        // data.original_url = playlist
        // data.entries = data.entries!.map((x) => ({
        //   ...x, original_url: playlist
        // }));
        // data.duration = data.entries!.reduce((p, x) => p + x.duration, 0)

        alasql('DELETE from entries where original_url = ?', data.entries![0].original_url)
        alasql('INSERT INTO entries SELECT * FROM ?', [data.entries])
        alasql('INSERT INTO watched (ie_key, id) SELECT ie_key, id FROM entries where title in (?)', ["[Deleted video]", "[Private video]"])

        delete data.entries
        alasql('DELETE from playlists where webpage_url = ?', data.webpage_url)
        alasql('INSERT INTO playlists SELECT * FROM ?', [[data]])

        app.cleanUpDuplicates('watched')
        addNewInput.disabled = false
        window.addNewInputSubmit.textContent = 'Submit'
        window.addNewInputSubmit.disabled = false
        app.refreshView()
      })
  },
  automaticPlay: function () {
    const timer = (s: number) => new Promise(res => setTimeout(res, s * 1000))

    async function run() {
      for (let v of Alpine.store('entries')) {
        if (Alpine.store('sett').autoplay) {
          Alpine.store('sett').selectedVideo = v
          await timer(v.duration);
        }
      }
    }

    run();
  },
  refreshView: function () {
    let constraints: string[] = []
    if (Alpine.store('sett').hideWatched) constraints.push('entries.id not in (select distinct id from watched)')

    const entriesWhere = constraints.length > 0 ? 'where ' + constraints.join(' and ') : ''
    const entriesOrderBy = ' order by ' + Alpine.store('sett').entriesOrderBy

    let entriesSQL = `select entries.*
        , watched.id IS NOT NULL as watched
      from entries
      outer join watched on watched.id = entries.id and watched.ie_key = entries.ie_key
      ${entriesWhere}
      ${entriesOrderBy}
    `
    const groupLimit = Alpine.store('sett').entriesLimit
    if (groupLimit != '') {
      const perPlaylistSQL = alasql(`select value from playlists`).map((pl: Playlist) => {
        const perPlaylistConstraints = [...constraints, `entries.original_url = "${pl.original_url}"`]
        const entriesWhere = perPlaylistConstraints.length > 0 ? 'where ' + perPlaylistConstraints.join(' and ') : ''
        const entriesOrderBy = ' order by ' + Alpine.store('sett').entriesOrderBy

        return `select entries.*
        , watched.id IS NOT NULL as watched
      from entries
      outer join watched on watched.id = entries.id and watched.ie_key = entries.ie_key
      join playlists on playlists.original_url = entries.original_url
      ${entriesWhere}
      ${entriesOrderBy} LIMIT ${groupLimit}`
      })
      entriesSQL = perPlaylistSQL.join(' UNION ALL ')
      console.log(entriesSQL);
    }

    const entries = alasql(entriesSQL)

    const playlistWhere = constraints.length > 0 ? 'where ' + constraints.join(' and ') : ''

    const playlists = alasql(`select playlists.*, sum(entries.duration) duration from playlists
      join entries on entries.original_url = playlists.original_url
      ${playlistWhere}
      group by playlists.original_url
    `)
    Alpine.store('playlists', playlists) // thanks @stackoverflow:Dauros
    Alpine.store('entries', entries)
  },
  exportCSVPlaylists: function () {
    return alasql("SELECT * INTO CSV('playlists.csv',{headers:true}) FROM ?", [Alpine.store('playlists')])
  },
  exportCSVEntries: function () {
    return alasql("SELECT * INTO CSV('videos.csv',{headers:true}) FROM ?", [Alpine.store('entries')])
  },
  createDB: function (dbname: string) {
    dbname = dbname + 'DB'
    alasql(`CREATE localStorage DATABASE IF NOT EXISTS ${dbname}`)
    alasql(`ATTACH localStorage DATABASE ${dbname}`)
    // if (!devMode)
    alasql(`USE ${dbname}`)
    alasql('SET AUTOCOMMIT ON')
    alasql('CREATE TABLE IF NOT EXISTS playlists');
    alasql('CREATE TABLE IF NOT EXISTS entries');
    alasql('CREATE TABLE IF NOT EXISTS watched');
  },
  switchDB: function (dbname: string) {
    const oldDB = alasql.databases.dbo.databaseid
    alasql(`DETACH DATABASE ${oldDB}`)
    alasql(`ATTACH localStorage DATABASE ${dbname}`)
    app.refreshView()
  },
  importDB: async function (event: Event) {
    let data = await fileToJSON(event)
    if (data.playlists || data.watched) alasql.tables = data
  },
  exportDB: function (dbname: string = alasql.databases.dbo.databaseid) {
    downloadObjectAsJson(alasql.tables, dbname)
  },
  deleteDB: function (dbname: string = alasql.databases.dbo.databaseid) {
    alasql('drop table entries')
    alasql('drop table playlists')
    alasql(`DETACH database ${dbname}`)
    alasql(`drop localstorage database ${dbname}`)
    app.refreshView()
  },
  isVideoWatched: function (v: { ie_key: string; id: string; }) {
    return alasql('select value FROM watched where ie_key=? and id=?', [v.ie_key, v.id])?.length > 0
  },
  markVideoWatched: function (v: { ie_key: string; id: string; }) {
    // if (app.isVideoWatched(v)) return;
    return alasql('INSERT INTO watched SELECT * FROM ?', [[{ ie_key: v.ie_key, id: v.id }]])
  },
  markVideoUnwatched: function (v: { ie_key: string; id: string; }) {
    return alasql('DELETE FROM watched where ie_key=? and id=?', [v.ie_key, v.id])
  },
  cleanUpDuplicates: function (table: string) {
    const d = alasql(`select distinct * from ${table}`)
    alasql(`delete from ${table}`)
    alasql(`insert into ${table} (ie_key, id) select ie_key, id from ?`, [d])
  },
  renderVideo: function (v: Entree) {
    function wrapPlayer(player: string) {
      return `<div style="height:50vh">${player}</div>`
    }
    let player = ''
    if (v.ie_key == 'Youtube') player = wrapPlayer(youtube(v.id))
    if (v.ie_key == 'Vimeo') player = wrapPlayer(vimeo(v.id))

    if (player !== '') app.markVideoWatched(v)
    return player
  },
  renderPlaylists: function () {
    const countWatched = alasql('select value count(distinct original_url) from entries where id in (select id from watched)')

    const tableHead = `<thead>
  <tr>
    <td colspan="100">
        <div>
          <span
            x-text="'Playlists ('+ $store.playlists.length + ($store.sett.hideWatched && ${countWatched} > 0 ? (' shown; ' + ${countWatched} + ' completely watched playlist' + (${countWatched} > 1 ? 's' : '')) : '') +')'"></span>
        </div>
    </td>
  </tr>
  <tr>
    <td>Title</td>
    <td title="Playlist Author">Channel</td>
    <td>Delete</td>
    <td>Duration</td>
  </tr>
</thead>`

    const playlistRow = html`<tr>
  <td><a :href="pl.webpage_url" x-text="pl.title"></a></td>
  <td><a :href="pl.channel_url" x-text="pl.uploader"></a></td>
  <td>
    <span
      @click="alasql('delete from playlists where original_url = ?',[pl.original_url]);alasql('delete from entries where original_url = ?',[pl.original_url]);app.refreshView()"
      style="cursor: pointer;" class="material-symbols-rounded">delete</span>
  </td>
  <td>
    <p x-text="
          (pl.playlist_count - $store.entries.filter(x=> x.original_url == pl.original_url).length) + ' of '+ pl.playlist_count + ' watched ('
        + Math.round((pl.playlist_count - $store.entries.filter(x=> x.original_url == pl.original_url).length) / pl.playlist_count) * 100.0 + '%); '
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
    const countWatched = alasql('select value count(distinct id) from watched')
    const sumPlaylistCount = alasql('select value sum(playlist_count) from playlists')

    const tableHead = `<thead>
  <tr>
    <td colspan="3">
      <template x-if="$store.entries.length > 0">
        <div style="display:flex;justify-content: space-between;">
          <span
            x-text="'Videos ('+ $store.entries.length + ($store.sett.hideWatched && ${countWatched} > 0 ? ' shown; ' + ${countWatched} + ' watched or unavailable videos' : '') +')'"></span>
        </div>
      </template>
    </td>
    <td colspan="4">
      <p style="float:right;"
        x-text="'Total: '
                  + (${sumPlaylistCount} - $store.entries.length) + ' of '+ ${sumPlaylistCount} + ' watched ('
                  + Math.round(((${sumPlaylistCount} - $store.entries.length) / ${sumPlaylistCount})) * 100.0 + '%); '
                  + app.secondsToFriendlyTime($store.entries.reduce((p,x) => p + x.duration, 0)) + ' ' + ($store.sett.hideWatched ? 'remaining' : 'total')">
      </p>
    </td>
  </tr>
  <tr>
    <td>Play</td>
    <td>Title</td>
    <td>Watched</td>
    <td>Duration</td>
    <td>Uploader</td>
    <td>URL</td>
    <td>Playlist Title (channel)</td>
  </tr>
</thead>`

    const videoRow = html`<tr>
  <td>
    <span @click="$store.sett.selectedVideo=v" style="cursor: pointer;"
      class="material-symbols-rounded">play_circle</span>
  </td>
  <td><span x-text="v.title" :title="v.title"></span></td>
  <td>
    <button @click="v.watched ? app.markVideoUnwatched(v) : app.markVideoWatched(v); app.refreshView()"
      x-text="v.watched ? 'Mark unwatched' : 'Mark watched'"></button>
  </td>
  <td><span x-text="app.secondsToFriendlyTime(v.duration)"></span></td>
  <td><span x-text="v.uploader"></span></td>
  <td><a :href="v.url" target="_blank">🔗</a></td>
  <td><span x-text="v.playlist_title +' ('+ v.channel +')'"></span></td>
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
  randimal,
  onomonopia
}

if (devMode) {
  // await app.fetchPlaylist('https://www.youtube.com/playlist?list=PLQhhRxYCuOXX4Ru03gUXURslatUNxk7Pm')
}

app.createDB('Runtime')
Alpine.start()
app.refreshView()


// if (!devMode && Math.random() < 0.05) fullstory();
