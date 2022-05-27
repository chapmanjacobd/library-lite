import { Alpine as AlpineType } from 'alpinejs'
import { alasql as alasqlType } from 'alasql'

declare global {
  var Alpine: AlpineType
  var alasql: alasqlType
  var app: Any
}
