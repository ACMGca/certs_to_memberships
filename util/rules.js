export const rules = {
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
        eligible: [{to: cAH, with: dARG, when: [cFA]}, {to: ARG, when: [cFA, cPP, cCPD, ATL]}]
    },
    AAG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dAAG, when: [cFA]}, {to: AAG, when: [cFA, cPP, cCPD, ATL]}]
    },
    ASG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dASG, when: [cFA]}, {to: ASG, when: [cFA, cPP, cCPD, ATL]}]
    },
    AHG: {
        supervises: [],
        supersedes: [],
        eligible: [{to: cAH, with: dAHG, when: [cFA]}, {to: AHG, when: [cFA, cPP, cCPD, ATL]}]
    },
    AHGW: { // Apprentice Hiking Guide with Winter Travel
        supervises: [],
        supersedes: [],
        eligible: [{to: AHG, with: dWT, when: [cFA, cPP, cCPD, ATL]}, {to: AHGW, when: [cFA, cPP, cCPD, ATL]}]
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