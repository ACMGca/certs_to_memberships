'use strict';

import { z } from 'zod'
import { CERTKEYLIST } from '../util/helpers.js';

export const getCognitoCertificateSchema = () => {

    const cognitoSchemaObject = {
        ProfileStatus: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'STAFF', 'UNDEFINED']),
        DateJoined: z.string().nullable(),
        DateEnd: z.string().nullable(),
        DateReinstate: z.string().nullable(),
        LastAnnualValidation: z.string().nullable(),
        IFMGALicenseNumber: z.string().nullable(),
        SkiExamMode: z.string().nullable(),
        transforms: z.string().array().min(0).default([])
    }

    // Define the schema for the individual certificate objects
    const certSchemaObject = z.object({
        status: z.string().nullable(),
        date: z.string().nullable(),
        lastModified: z.string().nullable(),
        isPermanent: z.boolean().optional()
    }).optional()

    // Add schema for each possible certificate object to the base schema
    const cognitoCertificateSchema = CERTKEYLIST.reduce((acc, cur) => {

        acc[cur] = certSchemaObject
        return acc
    }, cognitoSchemaObject)


    return z.object(cognitoCertificateSchema)
            .transform((data, ctx) => {

                // DATA_FIX_1
                // Correct for Mountain Guide profiles with no date on the MG certificate:
                // This uses the `DateJoined` value, if available, to create the start date used for the MG membership.
                if(data.MG && !data.MG.date){

                    data.MG.date = data.DateJoined
                    data.transforms.push(`MG.date backfilled with DateJoined`)
                }
                return data
            })
            .transform((data, ctx) => {

                // DATA_FIX_2
                // Coalesce PERM Apprentice certificates into the Regular Certificate Type and mark is as Permanent.
                // This allows us to retain the original truth of the *Permanent cert, but drop the *Perm tags which
                // we don't plan to support in the future. The goal is to preserve the business capability to support 
                // the concept of extended limits for Apprentice renewal, without clouding the data architecture with
                // specialized structures only used to support the legacy business decision.
                const perms = ['AHGPerm', 'ARGPerm', 'AAGPerm', 'ASGPerm']
                perms.forEach((permCertKey) => {

                    const regularCertKey = permCertKey.substring(0, 3)

                    // The goal is to drop the *Perm in favour of a regular version of the same
                    if(data[permCertKey]){ // it has one, so we proceed to replace it...

                        const certClone = Object.assign({}, data[permCertKey]) // create a copy as a starting point
                        // The business rule is that, once a Permanent Apprentice becomes non-Active, they lose the 
                        // privilege to renew as an Apprentice without being subject to reinstatement and current 
                        // Apprentice timeline policy.
                        // Upshot, only mark the record a *permanent* if it is Active:
                        if(data[permCertKey].status === 'Active'){
                            certClone.isPermanent = true  // then mark it as permanent
                        }
                        
                        // In the case that there is no date on the *Perm cert, but there is one on the regular one, use it.
                        if(!data[permCertKey].date && data[regularCertKey] && data[regularCertKey].date){
                            certClone.date = data[regularCertKey].date
                            data.transforms.push(`Backfilling ${permCertKey}.date with ${regularCertKey}.date: ${data[regularCertKey].date}`)    
                        }

                        // set the regular cert back onto the data
                        data[regularCertKey] = certClone
                        data.transforms.push(`Added ${regularCertKey}: ${Object.entries(certClone).join(' | ')}`)

                        // Lastly, delete the old *Perm one
                        data.transforms.push(`Removed ${permCertKey}: ${Object.entries(data[permCertKey]).join(' | ')}`)
                        delete data[permCertKey]
                    }
                })
                return data
            })
            .transform((data, ctx) => {

                // DATA_FIX_3
                // Correct for Resigned Certificates where LastModified is missing by backfilling with DateEnd when it is available.
                // This supports our ability to know when to end a Membership Tier bracket for a Resigned Members' history.
                if(data.DateEnd){
                    CERTKEYLIST.forEach((certKey) => {

                        if(data[certKey] && data[certKey].status === 'Resigned' && data[certKey].lastModified === null){

                            data[certKey].lastModified = data.DateEnd
                            data.transforms.push(`${certKey}.lastModified backfilled with DateEnd`)
                        }
                    })
                }
                return data
            })
            .superRefine((data, ctx) => {

                if(data.DateReinstate && data.DateEnd && (new Date(data.DateReinstate) < new Date(data.DateEnd))){
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Reinstatement date should be later than the End date",
                        path: ['DateReinstate']
                    })
                }

                CERTKEYLIST.forEach((certKey) => {

                    // Check for the presence of each possible certificate and raise issues:
                    if(data[certKey]){

                        // Certificate missing an issue date
                        if(['Active', 'Inactive', 'Resigned'].includes(data[certKey].status) && !data[certKey].date){

                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Certificates with a defined status require a date',
                                path: [certKey, 'date']
                            })
                        }

                        // Inactive or Resigned certificates missing lastModified date
                        // (The premise is that the certificate must have been another state before it became Inactive
                        //  or Resigned but we would be unable to detect the start date of the Inactive or Resigned status.)
                        if(['Inactive', 'Resigned'].includes(data[certKey].status) && !data[certKey].lastModified){

                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Certificates with Inactive or Resigned status require a lastModified date',
                                path: [certKey, 'lastModified']
                            })
                        }
                    }
                })
            })
}