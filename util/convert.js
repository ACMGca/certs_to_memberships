'use strict';
import { sub, format, compareDesc } from "date-fns";
import { rules } from "./rules.js";

const certSort = (a, b) => {

    if (new Date(a.date) < new Date(b.date)) return -1
    if (new Date(a.date) > new Date(b.date)) return 1
    return 0
}

/*
GOAL: Given a Cognito Certificates object, convert it to a Wicket Memberships object.
*/
export const convertCognitoToWicket = (cognito) => {

    const wicket = { professional: [] }

    const convertCert = (certObject) => {

        // Prepare the stub of the result array
        const result = [undefined, undefined, undefined, undefined]

        // Get a reference to the 'rule' object for the type of certificate
        const certRule = rules[certObject.certKey]

        // Set the Membership Tier slug value that is needed for Wicket import:
        result[0] = certRule.membership_tier_slug

        // If there is a JoinDate and it is later than the Cert Date then we should use it as the start of the bracket
        // because it indicates that the member joined the ACMG after the TAP designation was awarded.
        let bracketStartDate = new Date(certObject.date)
        if (cognito.DateJoined && (new Date(cognito.DateJoined) > bracketStartDate)) {

            bracketStartDate = new Date(cognito.DateJoined)
        }
        // That gives us enough information to set the start date of the first membership:
        result[2] = format(bracketStartDate, 'yyyy-MM-dd')

        // Now we need to determine if there is a certificate present which supersedes the first certificate.
        // If there is, we can use the start date of the second one to help to define the end date of the first bracket.
        // To do this, see if the `superseded_by` rule of the current cert intersects with other certs on the profile:
        const intersection = certRule.superseded_by.filter(x => certKeys.includes(x) && cognito[x].status && cognito[x].status !== 'RESIGNED');

        // If the `intersection` has a value, it means that other certificate 'superseded' the first one. 
        // And, based on that, we can use the start date of the second one to identify the end date of the first bracket.
        if (intersection.length > 0) {

            const supersedingCertKey = intersection[0]
            const supersedingCertDate = new Date(cognito[supersedingCertKey].date)
            // Subtract one day so it ends the day before the next one starts
            const certDateLessOneDay = sub(supersedingCertDate, { days: 1 })
            result[3] = format(certDateLessOneDay, 'yyyy-MM-dd')

            // We know that this first certificate was superseded so it must be a past and Inactive membership.
            const endDateInPast = compareDesc(certDateLessOneDay, new Date())
            if (endDateInPast === 1) {
                result[1] = 'Inactive'
            }
            else {
                throw new Error('ERROR>> The superseded certificate end date was not in the past. This is a data issue.')
            }
        }
        else{
            if(certObject.status && certObject.status.toLowerCase() === 'active'){
                result[1] = 'Active'
                // We have determined that the certificate is active so we should let it last until 
                // the end of the current membership year.
                // The right way to do this is to use the LastAnnualRenewal date and calculate it. 
                // TODO: For now, I am going to hard code this.
                result[3] = '2025-01-31'
            }
        }

        return result
    }

    // Determine the keys of the certs on the object
    const certKeys = Object.keys(rules).filter(x => Object.keys(cognito).includes(x))

    // Now we know the cert keys we are working with. Build a array we can sort based on cert dates:
    const certsArray = certKeys.map((certKey) => {

        return { ...cognito[certKey], certKey }
    }).sort(certSort)

    // Now we have the cert objects in the right order (asc by date).
    // For each of the certs on the cognito object, convert it to a date bracketed membership:
    wicket.professional = certsArray.map((cert) => {

        return convertCert(cert)
    })

    // TODO: Based on the Cognito `ProfileStatus` we can infer what the 'tail' of the membership
    // object should look like:
    // - Active: One of the Professional Certified memberships should be 'Active' and hit the *future* membership end date
    // - Inactive: A "Professional Inactive" membership should be 'Active' and hit the *future* membership end date AND 
    //             all other Professional Certified memberships should have end dates in the past
    // - Resigned: Every membership should have end dates in the past

    // TODO: Detectable 'mid career' Inactive periods can be filled with "Professional Inactive" membership
    // TODO: Detectable 'mid career' Resigned periods can be void of any membership

    // console.log(wicket)
    return wicket
}
