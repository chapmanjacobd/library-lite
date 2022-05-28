
import alasql from 'alasql';
import Alpine from 'alpinejs';
import LiteYTEmbed from 'lite-youtube-embed';
import 'lite-youtube-embed/src/lite-yt-embed.css';
import 'material-symbols/rounded.css';
import './style.css';

const devMode = window.location.hostname == 'localhost' || "127.0.0.1";

if (devMode) {
  import.meta.hot
  alasql.options.errorlog = true
}

let API_domain = "https://unli.xyz/api/yt/v1";
if (devMode) API_domain = "http://127.0.0.1:8000/v1";

alasql('CREATE localStorage DATABASE IF NOT EXISTS RuntimeDB')
alasql('ATTACH localStorage DATABASE RuntimeDB')
alasql('SET AUTOCOMMIT ON')
alasql('CREATE TABLE IF NOT EXISTS videos');

window.alasql = alasql
window.Alpine = Alpine
window.LiteYTEmbed = LiteYTEmbed

Alpine.store('table', [])
Alpine.store('sett', { showOnlyPlaylists: false })

window.app = {
  fetchPlaylist: async function (playlist: string) {
    if (playlist.length < 5) return;

    console.log('fetching new playlist');

    await fetch(`${API_domain}?playlist=` + playlist)
      .then(response => response.json())
      .then(data => {
        alasql('ATTACH localStorage DATABASE RuntimeDB')
        alasql('SET AUTOCOMMIT ON')

        alasql(`DELETE from videos where webpage_url = "${data.webpage_url}"`)
        alasql(`INSERT INTO videos SELECT * FROM ?`, [[data]])
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
    Alpine.store('table', alasql('select * from videos')) // thanks @stackoverflow:Dauros
    app.view.mpv = []

    console.table(alasql('select entries->length from videos'))
  },
  renderTable: function () {
    return `<table>

      <thead>
       <tr>
        <td colspan="100">
         <template x-if="$store.table.length > 0">
          <div>Data</div>
         </template>
         <template x-if="$store.table.length == 0">
          <div>Add a playlist</div>
         </template>
        </td>
       </tr>
      </thead>

      <template x-for="(pl, index) in $store.table" :key="index">
       <tbody>

        <tr>
         <td colspan="1"><a :href="pl.webpage_url" x-text="pl.title"></a></td>
         <td colspan="1"><a :href="pl.channel_url" x-text="pl.uploader"></a></td>
         <td colspan="2"><p x-text="
             (pl.playlist_count - pl.entries.length) + ' of '+ pl.playlist_count + ' watched ('
           + (pl.playlist_count - pl.entries.length) / pl.playlist_count * 100.0 + '%); '
           + app.secondsToFriendlyTime(pl.entries.reduce((p,x) => p + x.duration, 0)) + ' remaining'
         "></p></td>
        </tr>

        <template x-if="!$store.sett.showOnlyPlaylists">
          <template x-for="(v, index) in pl.entries" :key="index">
            <tr>
              <td><span x-text="v.title"></span></td>
              <td><span x-text="v.uploader"></span></td>
              <td><a :href="v.url" target="_blank">🔗</a></td>
              <td>
                <template x-if="v.ie_key == 'Youtube'">
                  <span class="material-symbols-rounded">play_circle</span>
                </template>
              </td>
            </tr>
          </template>
        </template>

       </tbody>
      </template>

      <template x-if="$store.table > 0">
       <tfoot>
        <tr>
         <td colspan="100">
          <div style="display: flex; justify-content: space-between; margin: 0 .5rem;"></div>
         </td>
        </tr>

       </tfoot>
      </template>

     </table>`
  }
}

if (devMode) {
  await app.fetchPlaylist('https://www.youtube.com/playlist?list=PL8A83124F1D79BD4F')
  await app.fetchPlaylist('https://www.youtube.com/playlist?list=PLAskVVPnzWMBa_Jw9IbCm_uyjI8oawr-W')
}

Alpine.start()


// if (!devMode && Math.random() < 0.05) fullstory();
