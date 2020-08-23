#!/usr/bin/env node

const Fs = require('fs')
const Fetch = require('isomorphic-fetch')
const Jsdom = require('jsdom')
const { JSDOM } = Jsdom
const MarkdownIt = require('markdown-it')

rip(process.argv.slice(2))

async function rip (hackmds) {
  return Promise.all(hackmds.map(async url => {
    const fetched = await fetchOrLocal(url)
    const dom = new JSDOM(fetched)
    const wrapper = dom.window.document
    const mdText = wrapper.getElementById('doc').textContent
    const md = new MarkdownIt()
    const body = md.render(mdText)
    const { document } = (new JSDOM(body)).window
    const pres = [...document.querySelectorAll("pre")]
    const entries = pres.map(
      elt =>
        Object.assign(
          {},
          elt.previousElementSibling
            ? { headingId: elt.previousElementSibling.id, headingText: elt.previousElementSibling.textContent}
            : {},
          {text: elt.textContent},
          elt.querySelector("code")
            ? {classList: elt.querySelector("code").classList}
            : {}
        )
    )
    entries.forEach(
      (entry, idx) => {
        const id = entry.headingId ||
              (entry.headingText.indexOf('\n') === -1
               ? entry.headingText.replace(/[^a-zA-Z0-9-_]/g, '_')
               : `entry-${idx}`)
        const fn = id + '.out'
        if (Fs.existsSync(fn)) {
          console.warn(`not overwriting ${fn}`)
        } else {
          console.log(`writing ${fn}`)
          Fs.writeFileSync(fn, entry.text, 'utf8')
        }
      }
    )
  }))
}

async function fetchOrLocal (urlOrFile) {
  console.warn(urlOrFile)
  if (urlOrFile.match(/^https?:\/\//)) {
    const resp = await Fetch(urlOrFile)
    return resp.text()
  } else {
    return Fs.promises.readFile(urlOrFile, 'utf8')
  }
}
