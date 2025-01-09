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