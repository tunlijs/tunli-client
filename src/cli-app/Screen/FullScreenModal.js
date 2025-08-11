import blessed from "blessed";

const centerContent = (text, boxWidth) => {
  const lines = text.split('\n')
  return lines.map(line => {
    const pad = Math.floor((boxWidth - line.length) / 2)
    return ' '.repeat(Math.max(pad, 0)) + line
  }).join('\n')
}
export const newFullScreenModal = (screen, text) => {
  // Backdrop zum Blocken von Inputs „unter“ dem Modal
  const backdrop = blessed.box({
    top: 0, left: 0, width: '100%', height: '100%',
    style: {bg: 'black'},
    mouse: true, clickable: true
  })

  // Größe anhand des Inhalts bestimmen (mit Padding & Border)
  const lines = text.split('\n')
  const contentWidth = Math.max(...lines.map(l => l.length))
  const contentHeight = lines.length
  const boxWidth = Math.min(contentWidth + 4, screen.width - 2)
  //const centeredQr = centerContent(text, screen.width - 2) // -2 wegen Padding/Border

  const qrBox = blessed.box({
    top: 'center',
    left: 'center',
    width: boxWidth,
    height: Math.min(contentHeight + 2, screen.height - 2),
    padding: {left: 1, right: 1},
    tags: false,
    scrollable: true,
    content: text,
    border: 'line',
    style: {
      fg: 'white',
      bg: 'black',
      border: {fg: 'cyan'}
    },
    keys: true,
    mouse: true,
    alwaysScroll: true
  })

  // Einfügen und nach vorne bringen
  screen.append(backdrop)
  screen.append(qrBox)
  qrBox.focus()
  screen.render()

  const close = () => {
    backdrop.detach()
    qrBox.detach()
    screen.render()
  }

  // Schließen über Tastatur/Click
  qrBox.key(['escape', 'q', 'C-q'], close)
  backdrop.on('click', close)

  // Bei Resize neu zentriert blessed automatisch; nur neu rendern
  screen.on('resize', () => screen.render())
}
