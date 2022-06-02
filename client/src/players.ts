import { Entree } from './types';

export function youtube(v: Entree) {
  const id = v.id
  const start = v.start ?? 0
  const end = v.end ?? 0

  return `<iframe id='ytplayer' type='text/html' width='100%' height='100%' src='https://www.youtube.com/embed/${id}?version=3&loop=0&playlist=${id}&autoplay=1&rel=0&start=${start}${end > 0 ? '&end=' + end : ''}&hl=en&cc_load_policy=1&cc_lang_pref=en&cc=1&hd=1&iv_load_policy=3&origin=https://www.unli.xyz' frameborder='0'
  allowfullscreen="allowfullscreen" mozallowfullscreen="mozallowfullscreen" msallowfullscreen="msallowfullscreen" oallowfullscreen="oallowfullscreen" allowscriptaccess="always" webkitallowfullscreen="webkitallowfullscreen"></iframe>`;
}
export function vimeo(v: Entree) {
  const id = v.id
  const start = v.start ?? 0

  return `<iframe src="https://player.vimeo.com/video/${id}?&autoplay=1#t=${start}s&color=ffffff&title=0&byline=0&portrait=0"
                style="width:100%;height:100%;" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen>
            </iframe>  <script src="https://player.vimeo.com/api/player.js"></script>`
}
