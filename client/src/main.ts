
import './style.css'

import Alpine from 'alpinejs'
import alasql from 'alasql'
import { obj2schema } from './utils'

alasql.options.errorlog = true

window.alasql = alasql
window.Alpine = Alpine
Alpine.start()



alasql('CREATE localStorage DATABASE IF NOT EXISTS Videos')
alasql('ATTACH localStorage DATABASE Videos AS RuntimeDB')
alasql('SET AUTOCOMMIT ON')


window.app = {
  fetchPlaylistInfo: async function fetchPlaylistInfo(playlist: string) {

    fetch("http://127.0.0.1:8000/v1?playlist=" + playlist)
      .then(response => response.json())
      .then(data => {
        const schema = obj2schema(data, 'videos')
        Object.keys(schema).map(k => {
          const columns = schema[k].join(',')
          const sql = `CREATE TABLE IF NOT EXISTS ${k} (${columns})`
          // console.log(sql);
          console.log(data[k]);

          alasql(sql);
          alasql(`INSERT INTO ${k} SELECT * FROM ?`, [data[k]])
        });

      })
  }
}
