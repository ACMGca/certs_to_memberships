# IFMGA Data Feed - Wicket API Integration

## Background

The ACMG currently support a JSON data feed consumed daily by the IFMGA in Europe. 

The URL and content for the data feed is supported via the `api.acmg.ca` Cloudflare Worker. 
This process pulls data from the Cloudflare D1 database and builds the response structure
to conform with the IFMGA schema expectations.

The migration task is to maintain the current functional contract between the ACMG and IFMGA while
converting the datasource from the D1 database to the Wicket API.

## Logic Steps

We believe that ~2 Wicket API calls will be able to produce the source information needed
to support the datasource transition.

### (1) IFMGA Segment READ

The Wicket MDP will have a Segment configured which identifies all of the ACMG members who
should be represented in the IFMGA data feed. This API will return the GUIDs of the right 
people but not the necessary profile information:

The returned payload will be one to many pages (*recursively retrieved*) containing the People GUIDS which
can be collected into a new array as an input for step 2. 

    # The Segment GUID used here is not correct - for illustration only
    export IFMGA_SEGMENT_GUID=47d14f4a-e84f-4f3b-a158-a55528b468ec
    curl -H "Authorization: Bearer $WICKET_STAGING_JWT" https://acmg-admin.staging.wicketcloud.com/api/segment_filters/$IFMGA_SEGMENT_GUID/results\?page%5Bnumber%5D\=1\&page%5Bsize%5D\=12 \
    | jq '.data[] | select(.relationships.resource.data.type == "people") | .relationships.resource.data.id'

### (2) Person Query (hydration)

With an array of People GUIDS from the prior step, process a query against the `people` collection to get
the necessary data for the data feed response builder: 

    curl --location --request POST 'https://acmg-admin.staging.wicketcloud.com/api/people/query?include=emails,addresses' \
    --header "Authorization: Bearer $WICKET_STAGING_JWT" \
    --header 'Content-Type: application/json' \
    --data-raw '{ "filter": { "search_query": { "uuid": ["6c2df445-7d43-4bd9-bb49-ca034bb51e0c","902a1ff8-d4a4-4ba0-ae1e-71c253219efb","615dc0dd-9907-425e-acdf-f7865b6534ef"] } } }' \
    | jq '.data[].attributes.full_name'

    # just to show that we have people data in the response

### (3) Reassemble the expected IFMGA object schema

    {
      "id": "CA-00021",                         // Wicket membership_number
      "lastname": "Deloop",                     // Wicket given_name
      "firstname": "Tommy",                     // Wicket family_name
      "certification": "Certified IFMGA Guide", // static value
      "city": "Canmore",                        // address [attributes.city]
      "country": "CA",                          // address [attributes.country_code]
      "email": "deloop@email.com",              // email [primary_email_address] or could be another as an option
      "postal_code": "D1W 1S9"                  // address [attributes.zip_code]
    },
