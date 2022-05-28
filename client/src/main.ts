
import './style.css'
import '../node_modules/lite-youtube-embed/src/lite-yt-embed.css'

import Alpine from 'alpinejs'
import alasql from 'alasql'
import LiteYTEmbed from 'lite-youtube-embed'
import { fullstory } from './tracking'

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

window.app = {
  alpineUpdate: function (evtName: string) {
    const event = new Event(evtName)
    window.dispatchEvent(event)
  },
  fetchPlaylist: async function (playlist: string) {
    if (playlist.length < 5) return;

    console.log('fetching new playlist');

    fetch(`${API_domain}?playlist=` + playlist)
      .then(response => response.json())
      .then(data => {
        alasql('ATTACH localStorage DATABASE RuntimeDB')
        alasql('SET AUTOCOMMIT ON')

        alasql(`DELETE from videos where webpage_url = "${data.webpage_url}"`)
        alasql(`INSERT INTO videos SELECT * FROM ?`, [[data]])
        app.alpineUpdate('tableListUpdate')
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
  view: {},
  updateView: function () {
    app.view.mpv = []
  }
}

if (devMode) {
  app.fetchPlaylist('https://www.youtube.com/playlist?list=PL8A83124F1D79BD4F')
  app.fetchPlaylist('https://www.youtube.com/playlist?list=PLAskVVPnzWMBa_Jw9IbCm_uyjI8oawr-W')
}

Alpine.start()


// if (!devMode) fullstory();
