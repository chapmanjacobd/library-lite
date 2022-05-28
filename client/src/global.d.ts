import { Alpine as AlpineType } from 'alpinejs'
import { alasql as alasqlType } from 'alasql'
import { LiteYTEmbed } from 'lite-youtube-embed'

declare global {
  var Alpine: AlpineType
  var alasql: alasqlType
  var app: Any
  var LiteYTEmbed: LiteYTEmbed
}
