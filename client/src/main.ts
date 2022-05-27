
import './style.css'

import Alpine from 'alpinejs'
import alasql from 'alasql'
import { obj2schema } from './utils'

alasql.options.errorlog = true

window.alasql = alasql
window.Alpine = Alpine
Alpine.start()



alasql('CREATE localStorage DATABASE IF NOT EXISTS Videos')


window.app = {
  fetchPlaylistInfo: async function fetchPlaylistInfo(playlist: string) {

    fetch("http://127.0.0.1:8000/v1?playlist=" + playlist)
      .then(response => response.json())
      .then(data => {
        alasql('ATTACH localStorage DATABASE Videos AS RuntimeDB')
        alasql('SET AUTOCOMMIT ON')

        alasql(`DELETE from videos where webpage_url = "${data.webpage_url}"`)
        alasql('CREATE TABLE IF NOT EXISTS videos');
        alasql(`INSERT INTO videos SELECT * FROM ?`, [[data]])
      })
  }
}

app.fetchPlaylistInfo('https://www.youtube.com/playlist?list=PL8A83124F1D79BD4F')
