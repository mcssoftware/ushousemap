const path = require('path');
const express = require('express');

const app = express(),
    DIST_DIR = __dirname,
    HTML_FILE = path.join(DIST_DIR, 'index.html')
app.use(express.static(DIST_DIR, {
    maxAge: '2 days',
    etag: true,
    setHeaders: function (res, path, stat) {
        res.set('x-timestamp', Date.now())
    }
}));
// app.get('*', (req, res) => {
//     res.sendFile(HTML_FILE)
// })
const PORT = process.env.PORT || 2112
app.listen(PORT, () => {
    console.log(`App listening to ${PORT}....`)
    console.log('Press Ctrl+C to quit.')
})