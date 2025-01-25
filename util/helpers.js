'use strict'
import { addMonths } from "date-fns"

export const CERTKEYLIST = ['MG','AG','SG','RG','AAG','ASG','ARG','AHG','DHG','HG','HGWT','CGI1','CGI2','CGI3','TRCI','VFG','AHGPerm','AAGPerm','ASGPerm','ARGPerm']

export const sortProfileFileNames = (a,b) => {

    if(Number(a.split('.')[0]) < Number(b.split('.')[0])){
        return -1
    }else if(Number(a.split('.')[0]) > Number(b.split('.')[0])){
        return 1
    }else{
        return 0
    }
}

// Determine if the profile contains evidence of prior certification
export const getCertificationHistory = (profile) => {

    const certs = CERTKEYLIST.reduce((acc, cur) => {

        if((profile[cur] || profile[`${cur}Date`] || profile[`${cur}LastModified`])){
            acc[cur] = {}
            acc[cur].status = profile[cur]
            acc[cur].date = profile[`${cur}Date`]
            acc[cur].lastModified = profile[`${cur}LastModified`]
        }

        return acc

        
    }, {})

    const { ProfileStatus,
            DateJoined, 
            DateEnd, 
            DateReinstate, 
            IFMGALicenseNumber, 
            LastAnnualValidation, 
            Mode,
            HikeTimeLimit,
            RockTimeLimit,
            AlpineTimeLimit,
            SkiTimeLimit,
        } = profile

    const result = { ProfileStatus,
                     DateJoined, 
                     DateEnd, 
                     DateReinstate, 
                     LastAnnualValidation, 
                     IFMGALicenseNumber, 
                     SkiExamMode: Mode,
                     HikeTimeLimit,    // Add any known 
                     RockTimeLimit,   // time limit 
                     AlpineTimeLimit,// values available on the member profile
                     SkiTimeLimit,  // to support Apprentice* TimeLimitDate and TimeLimitExtensionDate calculations (if applicable)
                     ...certs }

    return Object.keys(certs).length > 0 ? result : null
}

/**
 * Add 44 months to a date
 * @param {Date} date 
 * @returns Date - the original date plus 44 months
 */
export const addFortyFourMonths = (date) => {

    if(!date || !date instanceof Date) throw new TypeError('Input must be a Date to add 44 months to it.')

    return addMonths(date, 44)
}

/**
 * Convert a Cognito My Profile data object into a simpler string representation of the same.
 * @param {Object} p - Profile object representing the original state from Cognito Forms
 * @returns {String} A stripped down, formatted, string representation of the original profile suitable for storage in Wicket MDP
 */
export const cleanCognitoMyProfile = (p) => {

    delete p.Form
    delete p.MemberPhoto
    delete p.IFMGAPadLeft
    delete p.Entry.User
    delete p.Entry.Action
    delete p.Entry.Role
    delete p.Entry.Order
    delete p.Entry.PublicLink
    delete p.Entry.InternalLink
    delete p.Entry.Number
    delete p.Entry.Document1
    delete p.Entry.Document2
    delete p.Entry.Document3
    delete p.Entry.Document4
    Object.keys(p).forEach((k) => {

        if(!p[k]) delete p[k]
        if(k.endsWith('_QuantitySelected')) delete p[k]
        if(k.endsWith('_QuantityUsed')) delete p[k]
        if(k.endsWith('_QuantityLimit')) delete p[k]
        if(k.endsWith('_QuantityLimitCalculated')) delete p[k]
        if(k.endsWith('_IncrementBy')) delete p[k]
        if(k.endsWith('_Maximum')) delete p[k]
        if(Array.isArray(p[k]) && p[k].length === 0) delete p[k]
    })
    if(!p?.Nationality1?.Id) delete p.Nationality1
    if(!p?.Nationality2?.Id) delete p.Nationality2
    if(p.AdministrativeNotes && p.AdministrativeNotes.length > 0){

        p.AdministrativeNotes.forEach((note) => {

            delete note.Id 
            delete note.ItemNumber
        })
    }
    Object.keys(p.LegalName).forEach((k) => {

        if(!p.LegalName[k]) delete p.LegalName[k]
    })
    Object.keys(p.Residence).forEach((k) => {

        if(!p.Residence[k]) delete p.Residence[k]
        delete p.Residence.FullInternationalAddress
    })
    if(p.Mailing){
        Object.keys(p.Mailing).forEach((k) => {

            if(!p.Mailing[k]) delete p.Mailing[k]
            delete p.Mailing.FullInternationalAddress
        })
        // If mailing is the same as residence, delete mailing
        const keepMailing = Object.keys(p.Residence).map((k) => {
    
            return p.Residence[k] !== p.Mailing[k]
        }).reduce((acc, cur) => {
    
            if(cur === true) acc = true
            return acc
        }, false)
        if(!keepMailing) delete p.Mailing
    }

    if(p.FirstAidProvider){
        p.FirstAidProviderLabel = p.FirstAidProvider.Label 
        delete p.FirstAidProvider
    }

    delete p.Id
    return JSON.stringify(p, null, 2)
}