import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import { basicAuth } from 'hono/basic-auth'
// import { HTTPException } from 'hono/http-exception'

const app = new Hono()
app.use('*', prettyJSON())
app.use('*', cors())

app.get('/', (c) => c.redirect('https://acmg.ca'))

// Basic AuthN
app.use('/admin/*', async (c, next) => {
    const auth = basicAuth({
        username: 'wicketstaging',
        password: c.env.WICKET_STAGING_BASICAUTHPASSWORD,
        realm: 'WICKET_STAGING_TOKEN'
    })
    return auth(c, next)
})

app.get('/hello', (c) => c.text('hello world'))

app.get('/admin', () => {

    c.text('secure')
})
export default app