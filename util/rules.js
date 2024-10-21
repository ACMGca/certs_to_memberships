'use strict';

/*
Lowercase 'd' indicates a 'Designation'
Lowercase 'c' indicated a 'Constraint'
*/

// Mountain Guide
const IFMGA = 'IFMGA Member'
const MG = 'Mountain Guide Member'

// Alpine Guide
const AG = 'Alpine Guide Member'
const dAG = 'TAP Alpine Guide Designation'
const AAG = 'Apprentice Alpine Guide Member'
const dAAG = 'TAP Apprentice Alpine Guide Designation'

// Ski Guide
const SG = 'Ski Guide Member'
const dSG = 'TAP Ski Guide Designation'
const ASG = 'Apprentice Ski Guide Member'
const dASG = 'TAP Apprentice Ski Guide Designation'

// Rock Guide
const RG = 'Rock Guide Member'
const dRG = 'TAP Rock Guide Designation'
const ARG = 'Apprentice Rock Guide Member'
const dARG = 'TAP Apprentice Rock Guide Designation'

// Hiking Guide
const HG = 'Hiking Guide Member'
const dHG = 'TAP Hiking Guide Designation'
const AHG = 'Apprentice Hiking Guide Member'
const dAHG = 'TAP Apprentice Hiking Guide Designation'
const HGW = 'Winter Hiking Guide Member'
const AHGW = 'Apprentice Winter Hiking Guide Member'
const dWT = 'TAP Winter Travel Designation'
const DHG = 'Day Hiking Guide Member'
const dDHG = '-- DHG Deprecated TAP Designation --'

// Climbing Instructor
const CGI1 = 'Climbing Gym Instructor Level 1 Member'
const dCGI1 = 'TAP Climbing Gym Instructor Level 1 Designation'
const CGI2 = 'Climbing Gym Instructor Level 2 Member'
const dCGI2 = 'TAP Climbing Gym Instructor Level 2 Designation'
const CGI3 = 'Climbing Gym Instructor Level 3 Member'
const dCGI3 = 'TAP Climbing Gym Instructor Level 3 Designation'
const TRCI = 'Top Rope Climbing Instructor Member'
const dTRCI = 'TAP Top Rope Climbing Instructor Designation'
const VFG = 'Via Ferrata Guide Member'
const dVFG = 'TAP Via Ferrata Guide Designation'

// Additional qualifications
const cFA = 'First Aid is Current'
const cPP = 'Professional Practice is Current'
const cCPD = 'Continuing Professional Development is Current'
const cAH = 'Current Account Holder'
const cATL = 'Apprentice Time Limit is not exceeded'
const cSM = 'Ski Guide Assessment Completed on Skis'

export const labels = {IFMGA, MG, AG, dAG, AAG, dAAG, SG, dSG, ASG, dASG, RG, dRG, ARG, dARG, HG, HGW, dHG, AHG, AHGW, dWT, dAHG, DHG, dDHG, CGI1, dCGI1, CGI2, dCGI2, CGI3, dCGI3, TRCI, dTRCI, VFG, dVFG, cFA, cPP, cCPD, cAH, cSM}


const rulesObject = {
    IFMGA: {
        supervises: [ARG, ASG, AAG, AHG, TRCI],
        supersedes: [],
        eligible: [{to: MG, when: [cSM]}]
    },
    MG: {
        supervises: [ARG, ASG, AAG, AHG, TRCI],
        supersedes: [RG, AG, SG, HG, AAG, ARG, ASG, AHG, TRCI],
        eligible: [{to: AG, with:dSG, when: [cFA, cPP, cCPD]},{to: SG, with:dAG, when: [cFA, cPP, cCPD]}, {to: MG, when: [cFA, cPP, cCPD]}]
    },
    RG: {
        supervises: [ARG, AAG, TRCI],
        supersedes: [ARG, TRCI],
        eligible: [{to: ARG, with:dRG, when: [cFA, cPP, cCPD]}, {to: RG, when: [cFA, cPP, cCPD]}]
    },
    SG: {
        supervises: [ASG, AHGW],
        supersedes: [ASG],
        eligible: [{to: ASG, with:dSG, when: [cFA, cPP, cCPD]}, {to: SG, when: [cFA, cPP, cCPD]}]
    },
    AG: {
        supervises: [AAG, ARG, AHG, TRCI],
        supersedes: [AAG, ARG, AHG, AHGW, HG, HGW, DHG, TRCI],
        eligible: [{to: AAG, with:dAG, when: [cFA, cPP, cCPD]}, {to: AG, when: [cFA, cPP, cCPD]}]
    },
    HG: {
        supervises: [AHG, AAG],
        supersedes: [AHG, DHG],
        eligible: [{to: AHG, with: dHG, when: [cFA, cPP, cCPD]}, {to: HG, when: [cFA, cPP, cCPD]}]
    },
    DHG: { // Day Hiking Guide (This is a Legacy Scope of Practice and the TAP designation for this is no longer offered.)
        supervises: [],
        supersedes: [],
        eligible: [{to: DHG, when: [cFA, cPP, cCPD]}] // only DHG can renew as DHG
    },
    HGW: { // Hiking Guide with Winter Travel
        supervises: [AHGW, AAG],
        supersedes: [AHG, AHGW],
        eligible: [{to: HG, with: dWT, when: [cFA, cPP, cCPD]}, {to: HGW, when: [cFA, cPP, cCPD]}]
    },
    ARG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dARG, when: [cFA]}, {to: ARG, when: [cFA, cPP, cCPD, cATL]}]
    },
    AAG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dAAG, when: [cFA]}, {to: AAG, when: [cFA, cPP, cCPD, cATL]}]
    },
    ASG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dASG, when: [cFA]}, {to: ASG, when: [cFA, cPP, cCPD, cATL]}]
    },
    AHG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dAHG, when: [cFA]}, {to: AHG, when: [cFA, cPP, cCPD, cATL]}]
    },
    AHGW: { // Apprentice Hiking Guide with Winter Travel
        supervises: [],
        supersedes: [],
        eligible: [{to: AHG, with: dWT, when: [cFA, cPP, cCPD, cATL]}, {to: AHGW, when: [cFA, cPP, cCPD, cATL]}]
    },
    CGI1: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dCGI1, when: [cFA]}, {to: CGI1, when: [cFA, cPP, cCPD]}]
    },
    CGI2: {
        supervises: [],
        supersedes: [CGI1],
        eligible: [{to: CGI1, with: dCGI2, when: [cFA, cPP, cCPD]}, {to: CGI2, when: [cFA, cPP, cCPD]}]
    },
    CGI3: {
        supervises: [],
        supersedes: [CGI1, CGI2],
        eligible: [{to: CGI3, when: [cFA, cPP, cCPD]}]
    },
    TRCI: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dTRCI, when: [cFA]}, {to: TRCI, when: [cFA, cPP, cCPD]}]
    },
    VFG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dVFG, when: [cFA]}, {to: VFG, when: [cFA, cPP, cCPD]}]
    }
}

/**
 * Export the rulesObject as 'rules' but not before adding `superseded_by` and
 * `membership_tier_slug` properties to each of the membership rule objects.
 */
export const rules = (function (){

    const augmented = Object.keys(rulesObject).reduce((acc, cur) => {

        // improve it by scanning the rulesObject object for every other membership that includes the current one in it's 'supersedes' property.
        acc[cur] = rulesObject[cur]
        acc[cur].superseded_by = Object.keys(rulesObject).map((scanKey) => {
    
            if(rulesObject[scanKey].supersedes.includes(labels[cur])){
                return scanKey
            }
        }).filter(v => v) // remove undefined elements

        // add a membership tier slug based on the English label value
        acc[cur].membership_tier_slug = labels[cur].toLowerCase().trim().replace(/ member/, '').replace(/\s/g, '_')

        return acc
    }, {})

    return augmented
})()