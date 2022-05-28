import { alasql as alasqlType } from 'alasql'
import { Alpine as AlpineType } from 'alpinejs'
import { LiteYTEmbed } from 'lite-youtube-embed'

declare global {
  var Alpine: AlpineType
  var alasql: alasqlType
  var app: Any
  var LiteYTEmbed: LiteYTEmbed
}
