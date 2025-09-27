# IFMGA Data Feed - Wicket API Integration

## Background

The ACMG currently supports a JSON data feed consumed daily by the IFMGA in Europe. 

The URL and content for the data feed is supported via the `api.acmg.ca` Cloudflare Worker. 
This process pulls data from the Cloudflare D1 database and builds the response structure
to conform with the IFMGA schema expectations.

The migration task is to maintain the current functional contract between the ACMG and IFMGA while
converting the backing datasource from the Cloudflare D1 database to the Wicket API.

ACMG Mountain Guides included in the IFMGA Data Feed are identified based on their inclusion
in the Wicket Segment [**IFMGA Dues Apply**](https://acmg-admin.staging.wicketcloud.com/segments/5ae1f5d9-1d4b-4782-a0f5-61db971b12ea).
Only those mountain guides who pay their IFMGA
dues through the ACMG are then reflected back to the IFMGA via the datafeed. Other mountain guides
who are ACMG Members but who pay their IFMGA dues via a different member association will not
be included in the ACMG's IFMGA Data Feed. (Presumably, such a person would appear on IFMGA.info
associated with the member association through which they paid their dues.)

## Logic Steps

Two Wicket API calls will be able to produce the source information needed to support the datasource transition.

Note: The ACMG Mountain Guide population is small (currently less than 200). The Wicket recommended maximum
page size for API calls is 500. Therefore the two calls used to support the data feed will declare a single
page request with a max of 500. This should serve the ACMG for the foreseeable future. If the ACMG Mountain Guide
population size approaches 500, this implementation will need to be revisited.

### (1) IFMGA Segment READ

The Wicket MDP will have a Segment configured which identifies all of the ACMG members who
should be represented in the IFMGA data feed. This API call will return the UUIDs of the right 
people but not the necessary profile information.

The returned payload will be one page containing the People GUIDS which can be collected into
a new array as an input for step 2. 

    export IFMGA_SEGMENT_GUID=5ae1f5d9-1d4b-4782-a0f5-61db971b12ea
    curl -H "Authorization: Bearer $WICKET_STAGING_JWT" https://acmg-admin.staging.wicketcloud.com/api/segment_filters/$IFMGA_SEGMENT_GUID/results\?page%5Bnumber%5D\=1\&page%5Bsize%5D\=300 \
    | jq '.data[] | select(.relationships.resource.data.type == "people") | .relationships.resource.data.id'

### (2) Person Query (attributes hydration)

With an array of People UUIDs from the prior step, process a query against the `people` collection to get
the necessary data for the data feed response builder: 

    curl --location --request POST 'https://acmg-admin.staging.wicketcloud.com/api/people/query?include=emails,addresses&page%5Bnumber%5D=1\&page%5Bsize%5D=300' \
    --header "Authorization: Bearer $WICKET_STAGING_JWT" \
    --header 'Content-Type: application/json' \
    --data-raw '{ "filter": { "search_query": { "uuid": ["7923c329-a7c3-4bcc-a8d1-4bf65b21de02","62a14e05-2cb9-4eb3-a97d-d0ebc9045378","fb93d05a-6b96-4d26-a79f-cf0142f47ca2","fb93d05a-6b96-4d26-a79f-cf0142f47ca2","b08b3752-a56a-473c-9f31-16b5b7923baa","f130b239-16ed-497a-ba55-601291217b7d","dcfd25a8-f840-439a-84b0-398a20b4c109","9952f705-c7e8-45b8-9ad0-94a2bdd77377","902a1ff8-d4a4-4ba0-ae1e-71c253219efb","11d50952-8e08-49fb-b8e9-c43dbb461722","8c20d09d-7b98-4246-92b7-39d3cd07827c","cb02909a-0ee5-46a6-9fdb-7c08e34ea1f3","9ee61634-acf6-4232-9bea-77b4466206ba","1e033d06-d236-402b-9a60-622ae0e09769","979cd819-f98a-4c32-b4d7-e61d3aac6b88","0de0508f-55e6-4cae-bd21-dbfbd86b144c","f2301e35-1dd9-4658-b959-7d78788d0de3","fb93d05a-6b96-4d26-a79f-cf0142f47ca2","c2552fd4-26bd-4b96-8cf5-6fe72904c1e3","92878b32-3812-48cb-a8ad-b85971b60511","980e1a2d-8cb1-4f02-8139-44c62449e3d6","eb1865ce-d9a2-42aa-8f0d-4ac29782e08d","7d591944-7175-4538-a12c-1c9e12c8274a","2e2ac1ca-2b9d-4938-a8e8-975e892b6730","8b9d78c2-7245-4f85-82f0-eb17f25d43b3","b5b9c1ff-a111-4a7f-a8bb-11dd5e3c02b6","29f1c883-78a3-46dd-86c2-459446b30c5b","a9d6b718-af7b-4b54-b83c-fdc0044f4556","e24c951b-dac0-46e9-9424-9814cd78fd8e","6ace8df9-6fe9-4ccf-af4c-f300517f6869","d89056e9-4cc2-45d3-aba5-f7574fd5e74c","22e16d93-2512-442d-9b71-3c89f6a620df","dcd5665a-614e-4191-b066-f9f89664e96e","7dec7a91-b487-411c-87ba-dd4d041a80b9","013b3002-a367-4720-95c9-f5c96e0b8b47","c98eb711-9c07-4f5c-ae0d-964fe9549412","3448c8d8-1790-41dd-9342-e07903bfe4c0","155f78b1-856a-486d-99d4-c367355e0ec7","465c294e-8157-4d8b-944b-a416dd88b54d","5e278865-cfce-4c82-8218-ba64bac95009","9aa5ebf2-fef4-4681-82d1-f7ef6a797ac0","cd991f04-9a13-4637-9257-f97d9a9c6e00","f6653ac5-fa46-4906-b175-574da330e18c","5242f1cc-4e62-4436-b570-964df98338d3","eb5c0264-5ace-4343-bd99-636652cc3499","9cb8aea9-7568-4177-b109-226f125823c1","13094f6b-78d0-4f17-bfba-cd0003b4f375","015002aa-ecbf-48ad-a6be-98022dbcea1b","e9ad8b56-6552-4ba3-b8bc-6ae6e2d044c9","aeed00a1-b32a-47f0-bfef-8f6f94714bbb","e5083e75-6133-44a7-b3fa-984a9ad4c1de","b61f3268-5bc7-42c8-8b5b-46850c8a583e","da9ab7ee-977e-4115-a5fb-9ad241468530","723fa296-12c7-4320-81dd-a3b09a9396ec","c90a938f-eca1-42a4-92cf-7f036709d034","1918f9bd-d291-4962-84f2-0c3ebee11cbf","d1aa0012-d5fd-4caa-b111-14287d044046","4769f103-a407-462d-8e8b-b800fb1df970","a0c57c21-7c33-4ecd-9504-814912541adb","b9a3f5cd-fa29-42ad-b5ad-b0707b192034","c1213d72-5f08-479c-a8b4-cb09f2d41d83","3a83cb1f-310a-4cdc-b9be-c2e57d53536d","61b659c5-655c-4de4-8cb1-a83e128a17b1","e13d4318-9904-4ecf-9c81-5c4dbc13f943","93732c22-c9af-48cf-b3ad-baa911b06ff3","acaba8de-6aa7-4192-acd4-dc6835edf03a","8356bffb-da23-4f55-8479-a8b9bb2c9b50","25afe13a-fc13-446f-ae89-5ad61b1f1347","a95897ee-0b29-4897-8f86-0ae318947977","52b868c1-7a5b-4e9d-a0bd-8022c163c04d","54c7f700-3bbb-4259-ad08-b5d6fbe27974","11d15f3e-2433-4ff3-9ccb-fb594aba469a","b371a19f-44d5-4244-90da-a61afb67f4fd","7852fce1-828e-4ec9-b35f-9a508e3f2beb","b67c0058-c719-4dda-afc6-1db8ffafb718","6c8a4bea-df38-4cf8-80a7-5fee31b06bcc","4c90c9f0-8333-4eac-99f2-ba2f84077bb3","74c01261-1992-47a4-a4d5-a1f8398749ac","d8ddd8c2-53ef-407f-95df-d5ab3ff2956e","936ce9a1-e646-4daf-b903-940fefc2ff3a","4aaf3e20-b655-4f5b-af70-218508625eec","7399359a-cec4-452e-a7dc-57856bb1c7a7","c82e2a3d-83f3-4037-b527-63afe1e1e21e","f130d798-d37c-4d48-9174-3a651a395aac","dd0e7c4a-daa3-4773-9758-76a661d0b510","093df868-b72b-4d4a-b8be-f52e00b2de47","8731e948-84f9-4c93-86ad-e875d5666ac9","81e82410-adee-44e9-b47b-c44be77d3583","ba3c7c87-ec5b-434d-830d-ee4630acbcc8","6ed8a703-8b82-4b53-a6ad-d1dfe9917b18","8b9bd9d3-f274-49c9-b77c-3b180374605d","aa7b1d63-edaf-4d14-897c-e5317f32a7d3","a07a5f4b-bc9e-430f-b92b-39d2bbd74595","befb9031-3a69-4f55-8809-a7e41ec0b007","823fcdec-4430-49d7-bc3d-12dfcc45179c","f9d65710-c046-411f-b1ce-b68abb660bdb","21e28bfc-2117-4b84-b460-5da2081db708","6d9862f7-cc24-48e6-8d02-68f044eb9324","f99968f1-500f-43a9-99ee-905be5f58e50","f56c4dbf-a11c-4130-a1d0-8aec25d2be44","f808f1b7-490f-47e1-97c8-477cf6a174e6","0ecb637b-2683-463d-9c7c-7c8c6bf86bd3","d60cb229-4858-4312-bfc4-66a369fbab90","a5f60be3-94ea-44d4-953c-0bf272053ad7","18d9fb57-6a4d-45d5-aa86-85fda7f23a12","47225711-d89c-493b-bb26-655475ca1c6a","ac05d2e6-b811-4427-8a94-a1cb124c3c0e","3b319203-5123-41f3-8142-5afc94d546c9","7901504e-fe65-450b-b8cd-e4d12a4b100d","ddde5b3d-9ec2-481b-a801-67349bf46744","52ace3b6-2dd8-4782-bdac-f9797770400b","a59d77a4-eaa2-472a-917b-8cbbcad99bb0","051cc8fc-2012-4a13-a36e-244ecdf2d992","65f63a07-736d-4aa9-9f88-2a507d4f8d2a","2970ffe8-4c4f-4937-ad2e-9089218373f0","ade3f350-6dbe-4b58-a1e6-a99ef9050a68","1168b2ea-7f6d-4609-a5f0-4e8687592e7d","3eaae38f-4d04-44a2-93aa-5dae5b3e5403","20c88779-d7f6-4395-a0d9-37c020c04058","a1ae79a3-1e02-4a4a-82d1-1baeea21ce6a","0caea8d1-221a-4f84-b146-a2706732e157","122633a0-7c8a-41f0-8ccd-5915b049f0f5","f29a4215-40a7-47cd-9032-d45e60c9d898","8456366d-1969-456c-8928-9519881e858c","e596c29f-3b96-4f10-8de9-2b3f3f684942","0e22462e-cb66-4088-aec7-24d76ea44197","401e2f54-ca18-40dc-82d5-468be749365b","c32a272f-71cf-49e6-9c4c-f47aeee392ca","8f6175e5-6b58-4139-a8e5-3a8e43abc9a3","ee69f58e-e24f-4903-85a7-694adb5c7f2d","9e3277c6-460d-4f99-98b2-eb4fdf443569","f30575af-5fea-4229-87ee-f862656cc54f","8e664e26-7d95-4bc7-8493-1ed975e00b47","0ad8c44b-c1af-489e-a68c-14f8c3b87862","e29e68aa-dd79-4167-8b2c-4210513160c4","27ed0413-cc1b-42a5-896e-f3385c9e3ebf","ffa57184-5aaf-4822-a915-7e88a4d209e3","68134eca-5e03-4f46-992c-354b35089c1e","3ab3205a-321d-4ddb-af66-2764dc325a65","aac4ae21-4a6d-46df-9458-082435e1f15c","41d7ec36-ed57-4af3-8c1b-491f7d2038b2","af6659f4-5d01-4782-ba9c-226ce8bd105a","b759505f-c6df-49c3-895b-1bd992aff284","51cfd332-d1a3-4b40-bb75-73db2402b03a","20fecb2e-13bb-4a5c-bef4-03475a1013e1","edf7c523-f763-4e6c-97a9-126605fe4ae7","244122ac-813a-4568-bc71-b255f519a1a1","c8365efc-fd49-41be-98d4-aac8f3064597","3f4b2b1c-8d5f-428d-8df5-9d5eee0339b4","ce724695-8be0-4f2c-a34b-5ff718cac1ea","a4fcf8c2-d711-4899-b078-6301dac7fd10","b94f50ca-0715-49b3-8445-cfbcfcebbe4e","6b06e7e5-0176-46b0-b158-9f11627c8b39","1de483cc-922d-42f6-a778-8ab4b523d59a","20486750-b833-44b2-acbe-c02622bb19f7","75bcf7d9-5f75-4c9c-8d41-fb565abaff57","4d801040-476e-41bd-b9af-c516b62d6413","f3435cba-4055-44f6-a2d7-ae1277f2ee01","8043c94d-aa65-482d-af69-eba6a4183d47","2be228a3-69f4-4298-b2be-3a0cb8085dec","c4a33d65-5648-4740-873c-2bc5b39a5995","41407be7-4866-4470-93ce-e5a00704381a","efbfe396-a132-45a1-90d7-538f9c0a6938","ee5648c5-2eea-464f-a622-c7556bbe3e27","9aab7be9-d166-43cf-a7bd-9b45289535e6","76e741a1-aac1-46fc-91e1-b598807f717e","45d4d847-7592-45b9-bf28-5a886e497ede","f14e3baf-be4d-4c7a-b575-f116850cc64e","47a5e9bc-bf85-49a0-afb1-87662296ba9d","e6c89bb1-7a58-4f24-8b80-9164c765b294","4094964e-cf88-42ca-8456-b6474bd92914","ad520cfe-672b-4424-aa46-aed7dc9ba35f","580f4e9f-44d0-4f9c-80c9-90aa967a12e5","5236a2c7-9329-4982-939b-dcd534d5a75f","3e22e866-18f8-487c-8689-44e23db31ba7","f9a4fc5f-1f98-4c89-8cac-7651782684ee","f15523e9-5429-4b26-8df0-6f9f57029979","f43bf528-e00b-4bef-84dd-b2924789bbc0"] } } }' \
    | jq '.data[].attributes.full_name'


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
