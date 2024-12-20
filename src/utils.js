import { sign } from "hono/jwt"

export const createWicketPerson = async (person, tokenString) => {

    let response
    try {
        response = await fetch(`https://acmg-admin.staging.wicketcloud.com/api/people`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenString}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    type: 'people',
                    attributes: {
                        given_name: person.given_name,
                        family_name: person.family_name,
                        identifying_number: Number(person.identifying_number),
                        communications_double_opt_in: false,
                        user: {
                            password: 'ex@mplePassword',
                            password_confirmation: 'ex@mplePassword',
                            confirmed_at: `${new Date()}`,
                            skip_confirmation_notification: true
                        }
                    },
                    relationships: {
                        emails: {
                            data: [
                                {
                                    type: 'emails',
                                    attributes: {
                                        address: person.address
                                    }
                                }
                            ]
                        }
                    }
                }
            })
        })
        if (response.status !== 200) {

            return `${response.status} error creating Wicket Person`
        }
        const wicketResponseJson = await response.json()

        // this will either be the Wicket GUID of the found person, or undefined. 
        return wicketResponseJson?.data?.id
    } catch (error) {

        console.error(error.message)
    }
}

export const findWicketGuidByMemberNumber = async (memberNumber, tokenString) => {

    let response
    try {
        response = await fetch(`https://acmg-admin.staging.wicketcloud.com/api/people\?filter%5Bidentifying_number_eq%5D=${memberNumber}`, {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${tokenString}`
            }
        })
        if (response.status !== 200) {

            throw new HTTPException(response.status || 500, { statusText: response.statusText, message: `${response.status} - ${response.statusText} error retrieving data from Wicket` })
        }
        const wicketResponseJson = await response.json()

        // this will either be the Wicket GUID of the found person, or undefined. 
        return wicketResponseJson?.data[0]?.id
    } catch (error) {

        console.error(error.message)
    }
}

export const getWicketPersonMemberships = async (wicketPersonGuid, tokenString) => {

    let response
    try {
        response = await fetch(`https://acmg-admin.staging.wicketcloud.com/api/people/${wicketPersonGuid}/membership_entries`, {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${tokenString}`
            }
        })
        if (response.status !== 200) {

            throw new HTTPException(response.status || 500, { statusText: response.statusText, message: `${response.status} - ${response.statusText} error retrieving person memberships from Wicket` })
        }
        const wicketPersonMemberships = await response.json()

        // The following 4 step process converts the raw Wicket API response for person_memberships to a neater summary:
        // STEP 1
        const processed = wicketPersonMemberships?.data.reduce((acc, cur) => {

            if (!acc[cur.type]) {
                acc[cur.type] = []
            }
            acc[cur.type].push(cur)
            return acc
        }, {})
        // STEP 2 - collect the object names
        const included = wicketPersonMemberships?.included.reduce((acc, cur) => {

            if (!acc[cur.type]) {
                acc[cur.type] = {}
            }
            acc[cur.type][cur.id] = cur
            return acc
        }, {})
        // STEP 3 - summarize
        const summary = processed.person_memberships.map(m => {

            const category = included.memberships[m.relationships.membership.data.id].attributes.category
            const membership_name = included.memberships[m.relationships.membership.data.id].attributes.name
            return [category, membership_name, m.attributes.status, m.attributes.starts_at, m.attributes.ends_at]
        });
        // STEP 4 - Reduce the summary object by category to support sections on the MermaidJS Gantt chart
        const result = summary.reduce((acc, cur) => {

            if (!acc[cur[0]]) {
                acc[cur[0]] = []
            }
            acc[cur[0]].push(cur)
            return acc
        }, {})

        const final = {}
        Object.values(result).forEach(v => v.reverse())
        const wicketGanttSourceText = `gantt
dateFormat  YYYY-MM-DD
title Wicket Membership Gantt View
${Object.keys(result).map((category) => { return `\tsection ${category}\n${result[category].map((line, index) => `\t${line[1]}\t\t${line[2] === 'Active' ? ':active,' : ':done,'} ${category.toLowerCase().replace(' ', '_')}${index}, ${line[3].substring(0, 10)}, ${line[4] === null ? `${new Date().toISOString().substring(0, 10)}` : line[4].substring(0, 10)}`).join('\n')}` }).join('\n')}`

        final.json = result
        final.gantt = wicketGanttSourceText
        return final
    } catch (error) {

        console.error(error.message)
    }
}

export const getCognitoProfile = async (c, cognitoId) => {

    const cognitoRequestUrl = `https://www.cognitoforms.com/api/forms/267/entries/${cognitoId}?access_token=${c.env.COGNITO_API_KEY}`
    let response

    try {
        response = await fetch(cognitoRequestUrl, {
            method: "GET",
            headers: {
                'Accept': 'application/json'
            }
        })
        if (response.status !== 200) {

            throw new HTTPException(response.status || 500, { statusText: response.statusText, message: `${response.status} - ${response.statusText} error retrieving data from CognitoForms` })
        }
        const cognitoResponseJson = await response.json()
        return cognitoResponseJson
    } catch (error) {
        console.log('ERROR getting Cognito Profile>>', error.message)
        return null
    }
}

export const nameToInitials = (first, last) => {

    return `${first.substring(0, 1).toUpperCase()}.${last.substring(0, 1).toUpperCase()}.`
}

export const getStagingToken = async (c) => {

    const expDate = new Date(Date.now() + (1000 * 60 * 60 * 24))

    const tokenBody = {
        exp: Math.floor(expDate.getTime() / 1000),
        sub: c.env.WICKET_STAGING_API_ADMIN_GUID,
        aud: "https://acmg-api.staging.wicketcloud.com",
        iss: 'https://acmg.ca'
    }

    const token = await sign(tokenBody, c.env.WICKET_STAGING_SECRET)
    return token
}