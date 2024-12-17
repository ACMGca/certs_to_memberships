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

        return wicketPersonMemberships
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