import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
// import { basicAuth } from 'hono/basic-auth'
// import { HTTPException } from 'hono/http-exception'

const app = new Hono()
app.use('*', prettyJSON())
app.use('*', cors())

app.get('/', (c) => c.redirect('https://acmg.ca'))

app.get('/hello', (c) => c.text('hello world'))

export default app