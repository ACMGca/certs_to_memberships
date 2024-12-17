import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import { basicAuth } from 'hono/basic-auth'
import { HTTPException } from 'hono/http-exception'

import { getCognitoProfile, nameToInitials, getStagingToken, findWicketGuidByMemberNumber, getWicketPersonMemberships, createWicketPerson } from './utils.js'

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

app.get('/admin/preview/:cognitoEntryId', async (c) => {

    const cognitoEntryId = Number(c.req.param('cognitoEntryId').replace(',', ''))

    let cognitoProfile, initials, stagingToken, wicketPersonGuid, wicketPersonMemberships, wicketPersonStub
    if (cognitoEntryId) {
        cognitoProfile = await getCognitoProfile(c, cognitoEntryId)
        if(cognitoProfile){
            initials = nameToInitials(cognitoProfile.LegalName.First, cognitoProfile.LegalName.Last)
            wicketPersonStub = {
                given_name: cognitoProfile.LegalName.First,
                family_name: cognitoProfile.LegalName.Last,
                identifying_number: Number(cognitoProfile.MemberNumber),
                address: cognitoProfile.Email
            }
            stagingToken = await getStagingToken(c)
            wicketPersonGuid = await findWicketGuidByMemberNumber(cognitoProfile.MemberNumber, stagingToken)
            if(wicketPersonGuid){
                wicketPersonMemberships = await getWicketPersonMemberships(wicketPersonGuid, stagingToken)
            }
        }
    }
    return c.html(html`<!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ACMG Wicket Membership Preview</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.1.1/index.min.css">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/dm-mono@5.1.0/index.min.css">
            <script src="https://unpkg.com/htmx.org@2.0.4" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>
            <style>
                body {
                    font-family: "DM Mono";
                    margin-inline: 10%;
                }
                body h1,h2,h3 {
                    font-family: "Figtree";
                }
            </style>
        </head>
        <body>
            <h1>ACMG Wicket Membership Preview</h1>
            <p>CognitoForms ACMG My Profile: ${raw(initials ? `<a href="https://www.cognitoforms.com/acmg/acmgmyprofile/entries/1-all-entries/${cognitoEntryId}">${initials}</a>` : `Cognito Entry ${cognitoEntryId} does not exist.`)}${cognitoProfile ? ` [ Member Number: ${cognitoProfile.MemberNumber} ]`: ''} ${cognitoProfile ? ` [ ${cognitoProfile.ProfileStatus} ]`: ''}</p>

            <p>Wicket Person: <span id="wicketPersonGuid">${wicketPersonGuid ? raw(`<a href="https://acmg-admin.staging.wicketcloud.com/people/${wicketPersonGuid}">${wicketPersonGuid}</a>`) : raw(`no Wicket Person found <button hx-vals='${JSON.stringify(wicketPersonStub)}' 
                    hx-confirm="This will create the Wicket Person: \n
                      - First Name: ${wicketPersonStub.given_name} \n
                      - Last Name: ${wicketPersonStub.family_name} \n
                      - Member Number: ${wicketPersonStub.identifying_number} \n
                      - Email Address: ${wicketPersonStub.address} \n\n Proceed?" 
                    hx-post="/admin/wicket/people" 
                    hx-trigger="click" 
                    hx-target="#wicketPersonGuid" 
                    hx-swap="innerHTML">Create Wicket Profile for this Person
            </button>`) }
            </span></p>

            <pre>${JSON.stringify(wicketPersonMemberships, null, 2)}</pre>
            <p></p>
        </body>
        
        </html>`)
})

app.post('/admin/wicket/people', async (c) => {

    try {
        const body = await c.req.parseBody()
        const stagingToken = await getStagingToken(c)
        const personGuid = await createWicketPerson(body, stagingToken)
        return c.text(`<a href="https://acmg-admin.staging.wicketcloud.com/people/${personGuid}">${personGuid}</a>`)        
    } catch (error) {
        
        console.log(error.message)
    }

})

export default app