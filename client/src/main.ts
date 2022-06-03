
import alasql from 'alasql';
import Alpine from 'alpinejs';
import 'material-icons/iconfont/outlined.css';
import { vimeo, youtube } from './players';
import './style.css';
import { fullstory } from './tracking';
import { Entree, Playlist } from './types';
import { downloadObjectAsJson, fileToJSON, html, onomonopia, randimal, randomPASTEL, secondsToFriendlyTime, shuffle } from './utils';

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
  automark: true, autoplay: false, wadsworth: false, shuffleMode: "",
  selectedDB: 'RuntimeDB', search: ''
})

window.app = {
  log: function (txt: string) {
    if (window.log.value.split('\n').slice(-2)[0] == txt) return;
    window.eventLog.open = true
    window.log.value += txt + "\n"
    window.log.scrollTop = window.log.scrollHeight;
  },
  randomPASTEL, changeTheBackgroundColor, secondsToFriendlyTime,
  refreshView: function () {
    let constraints: string[] = []
    const search = Alpine.store('sett').search.toLowerCase().replace(' ', '%')

    if (Alpine.store('sett').hideWatched) constraints.push('entries.id not in (select distinct id from watched)')
    if (search != '') {
      constraints.push(`entries.title like "%${search}%"`)
    }

    const entriesWhere = constraints.length > 0 ? 'where ' + constraints.join(' and ') : ''
    const entriesOrderBy = ' order by ' + Alpine.store('sett').entriesOrderBy

    let entriesSQL = `select entries.*
        , watched.id IS NOT NULL as watched
      from entries
      outer join watched on watched.id = entries.id and watched.ie_key = entries.ie_key
      ${entriesWhere}
      ${entriesOrderBy}
    `
    // const groupLimit = Alpine.store('sett').entriesLimit
    // if (groupLimit != '') {
    //   const perPlaylistSQL = alasql(`select value from playlists`).map((pl: Playlist) => {
    //     const perPlaylistConstraints = [...constraints, `entries.original_url = "${pl.original_url}"`]
    //     const entriesWhere = perPlaylistConstraints.length > 0 ? 'where ' + perPlaylistConstraints.join(' and ') : ''
    //     const entriesOrderBy = ' order by ' + Alpine.store('sett').entriesOrderBy

    //     return `select entries.*
    //     , watched.id IS NOT NULL as watched
    //   from entries
    //   outer join watched on watched.id = entries.id and watched.ie_key = entries.ie_key
    //   join playlists on playlists.original_url = entries.original_url
    //   ${entriesWhere}
    //   ${entriesOrderBy} LIMIT ${groupLimit}`
    //   })
    //   entriesSQL = perPlaylistSQL.join(' UNION ALL ')
    //   console.log(entriesSQL);
    // }

    const playlistWhere = constraints.length > 0 ? 'where ' + constraints.join(' and ') : ''

    let playlistsSQL = `select playlists.*, sum(entries.duration) duration from playlists
      join entries on entries.original_url = playlists.original_url
      ${playlistWhere}
      group by playlists.original_url
    `
    // console.log(playlistsSQL);

    let entries = alasql(entriesSQL)

    if (entries.length == 0)
      entries = [{ title: `"${search}" did not match anything in the database` }]

    Alpine.store('playlists', alasql(playlistsSQL)) // thanks @stackoverflow:Dauros
    Alpine.store('entries', entries)
  },
  fetchPlaylist: async function (playlist: string) {
    function cleanup() {
      window.addNewInput.disabled = false
      window.addNewInputSubmit.textContent = 'Submit'
      window.addNewInputSubmit.disabled = false
      app.refreshView()
    }

    if (playlist.length < 5) return;

    app.log(`Getting data from ${playlist}`)

    const data = await fetch(`${API_domain}?playlist=` + playlist)
      .then(response => response.json())
      .then((data: Playlist) => {
        return data
      }).catch((err) => {
        app.log(`Could not load ${playlist}`);
        cleanup()
        throw err
      })

    // data.duration = data.entries!.reduce((p, x) => p + x.duration, 0)

    app.log(`Got ${data.entries!.length} videos from playlist "${data.title}"`)

    if ((alasql('select value count(*) from entries')) > 0)
      alasql('DELETE from entries where original_url = ?', data.entries![0].original_url)

    alasql('INSERT INTO entries SELECT * FROM ?', [data.entries]);

    alasql(`SELECT ie_key, id INTO watched from entries
          where title in (select _ from ?)`, [["[Deleted video]", "[Private video]"]]
    )

    delete data.entries
    alasql('DELETE from playlists where webpage_url = ?', data.webpage_url)
    alasql('INSERT INTO playlists SELECT * FROM ?', [[data]])

    app.cleanUpDuplicates('watched')

    // alasql('create index entries_id_idx on entries (id)')
    // alasql('create index entries_iekey_id_idx on entries (ie_key,id)')

    cleanup()
  },
  timeshift: function (videos: Entree[]): Entree[] {
    if (videos[0].start) return videos;

    const is_wadsworth = Alpine.store('sett').wadsworth
    const is_shuffle = Alpine.store('sett').shuffleMode > 0

    return videos.map(v => {
      let start = 0
      let end = v.duration

      if (is_wadsworth) start = Math.round(end * 0.3)
      if (is_shuffle) end = start + Number(Alpine.store('sett').shuffleMode)

      const newDuration = end - start
      return { ...v, duration: newDuration, start, end }
    })
  },
  playVideo: function (v: Entree) {
    app.markVideoWatched(v)
    Alpine.store('sett').selectedVideo = app.timeshift([v])[0]
    Alpine.nextTick(() => { app.refreshView() })
  },
  automaticPlay: function () {
    const timer = (s: number) => new Promise(res => setTimeout(res, s * 1000))

    async function run() {
      const videos = app.timeshift(Alpine.store('entries'))

      for (let v of videos) {
        const oldCount = videos.length
        if (Alpine.store('sett').autoplay) {

          if (v.duration && v.duration > 1) {
            app.playVideo(v)
            await timer(v.duration)
          }

          const newCount = Alpine.store('entries').length
          if (newCount > oldCount) {
            run()
            break;
          }

        }
      }
    }

    app.log('Starting autoplay')
    run();
  },
  stopAutomaticPlay: function () {
    app.log('Stopping autoplay')
    Alpine.store('sett').autoplay = false
  },
  playRandom: function () {
    if (Alpine.store('sett').autoplay)
      app.stopAutomaticPlay();
    const v = shuffle(Alpine.store('entries'))
    app.playVideo(v)
  },
  exportCSVPlaylists: function () {
    alasql("SELECT * INTO CSV('playlists.csv',{headers:true}) FROM ?", [Alpine.store('playlists')])
    app.log('Playlist CSV Exported')
  },
  exportCSVEntries: function () {
    alasql("SELECT * INTO CSV('videos.csv',{headers:true}) FROM ?", [Alpine.store('entries')])
    app.log('Videos CSV Exported')
  },
  isVideoWatched: function (v: Entree) {
    return alasql('select value FROM watched where ie_key=? and id=?', [v.ie_key, v.id])?.length > 0
  },
  markVideoWatched: function (v: Entree) {
    // if (app.isVideoWatched(v)) return;
    app.log(`Marked as watched ${v.title} [${v.id}] of ${v.original_url}`)
    alasql('INSERT INTO watched SELECT * FROM ?', [[{ ie_key: v.ie_key, id: v.id }]])
  },
  markVideoUnwatched: function (v: Entree) {
    alasql('DELETE FROM watched where ie_key=? and id=?', [v.ie_key, v.id])
    app.log(`Marked ${v.ie_key} video ${v.id} as unwatched`)
  },
  cleanUpDuplicates: function (table: string) {
    const d = alasql(`select distinct * from ${table}`)
    alasql(`delete from ${table}`)
    alasql(`insert into ${table} (ie_key, id) select ie_key, id from ?`, [d])
  },
  deletePlaylist: function (pl: Playlist) {
    alasql('delete from playlists where original_url = ?', [pl.original_url]);
    alasql('delete from entries where original_url = ?', [pl.original_url]);
    app.refreshView()
    app.log(`Deleted playlist ${pl.original_url}`)
  },
  renderVideo: function (v: Entree) {
    function wrapPlayer(player: string) {
      return `<div style="height:50vh">${player}</div>`
    }
    let rhtml = ''
    if (v.ie_key == 'Youtube') rhtml = wrapPlayer(youtube(v))
    if (v.ie_key == 'Vimeo') rhtml = wrapPlayer(vimeo(v))

    if (rhtml !== '') app.markVideoWatched(v)

    return rhtml
  },
  renderPlaylists: function () {
    const countWatched = `alasql('select value count(distinct id) from watched')`
    const countTotal = `alasql('select value count(distinct id) from entries')`

    const tableHead = `<thead>
  <tr>
    <td colspan="2">
        <div>
          <span>Playlists</span>
        </div>
    </td>
    <td colspan="2">
      <p style="float:right;"
        x-text="'All playlists: '
                  + app.secondsToFriendlyTime($store.entries.reduce((p,x) => p + (x.duration ?? 0), 0)) + ' ' + ($store.sett.hideWatched ? 'remaining' : 'total')">
      </p>
    </td>
  </tr>
  <tr>
    <td>Title</td>
    <td title="Playlist Author">Channel</td>
    <td>Delete</td>
    <td>Duration</td>
  </tr>
</thead>`

    const plVideosCount = `$store.entries.filter(x=> x.original_url == pl.original_url).length`
    const playlistRow = `<tr>
  <td><a :href="pl.webpage_url" x-text="pl.title"></a></td>
  <td><a :href="pl.channel_url" x-text="pl.uploader"></a></td>
  <td>
    <span @click="app.deletePlaylist(pl)" style="cursor: pointer;" class="material-icons-outlined">delete</span>
  </td>
  <td>
    <p x-text="
          app.secondsToFriendlyTime(pl.duration) + ' ' + ($store.sett.hideWatched ? 'remaining' : 'total')
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
    const countAllWatched = `alasql('select value count(distinct id) from watched')`
    const countEntriesWatched = `alasql('select value count(distinct entries.id) from entries join watched using ie_key, id')`

    const tableHead = `<thead>
  <tr>
    <td colspan="3">
      <template x-if="$store.entries.length > 0">
        <div style="display:flex;justify-content: space-between;">
          <span
            x-text="'Videos ('+
              $store.entries.length + ($store.sett.hideWatched && (${countEntriesWatched} > 0)
              ? '; ' + ${countEntriesWatched} + ' watched or unavailable videos'
              : '') +')'
          "></span>
        </div>
      </template>
    </td>
    <td colspan="4">
      <p style="float:right;" x-text="'Total watched: '+ ${countAllWatched} + ' videos'"></p>
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
    <span @click="app.playVideo(v)" style="cursor: pointer;" class="material-icons-outlined">play_circle</span>
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
    <template x-for="(v, vindex) in $store.entries.slice(0,800)" :key="vindex">
      ${videoRow}
    </template>
  </tbody>
  ${tableFoot}
</table>`
  },
  createDB: function (dbname: string) {
    dbname = dbname + 'DB'

    alasql(`CREATE localStorage DATABASE IF NOT EXISTS ${dbname}`)
    alasql(`ATTACH localStorage DATABASE ${dbname}`)
    alasql(`USE DATABASE ${dbname}`)
    alasql('SET AUTOCOMMIT ON')

    alasql('CREATE TABLE IF NOT EXISTS entries');
    alasql('CREATE TABLE IF NOT EXISTS playlists');
    alasql('CREATE TABLE IF NOT EXISTS watched');
  },
  switchDB: function (dbname: string) {
    const oldDB = alasql.databases.dbo.databaseid
    alasql(`DETACH DATABASE ${oldDB}`)
    alasql(`ATTACH localStorage DATABASE ${dbname}`)
    app.refreshView()
  },
  importDB: async function (event: Event) {
    const newdbname = event.target.files[0].name.split('.')[0].replace('(', '_').replace(')', '')

    if (Object.keys(alasql.databases).includes(newdbname))
      throw new Error("New DB has the same name as existing. Delete existing DB first or rename the file");

    app.createDB(newdbname)
    let data = await fileToJSON(event)
    alasql.tables = data;
    app.refreshView()
  },
  exportDB: function (dbname: string = alasql.databases.dbo.databaseid) {
    downloadObjectAsJson(alasql.tables, dbname)
  },
  deleteDB: function (dbname: string = alasql.databases.dbo.databaseid) {
    alasql('drop table entries')
    alasql('drop table playlists')
    alasql(`DETACH database ${dbname}`)
    alasql(`drop localStorage database ${dbname}`)
    location.reload()
  },
  randimal,
  onomonopia,
};

app.createDB('Runtime')

if (devMode) {
  // app.fetchPlaylist('https://www.youtube.com/playlist?list=PLQhhRxYCuOXX4Ru03gUXURslatUNxk7Pm')
}

Alpine.start()
app.refreshView()

if (!devMode && Math.random() < 0.05) fullstory();
