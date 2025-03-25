# certs_to_memberships

Exploration of programmatic conversion of ACMG certificate-state to membership-state.

## About

This is a utility project intended to support technical communication.

The project has no public value. 


## Develop / Run

The [bun](https://bun.sh) JavaScript runtime is used in this project.

    git clone ... 
    bun install
    bun test
    # acquire necessary api key
    ./fetch_cognito_profiles.sh
    bun util/parseAll.js


## Usage

There are 2 halves to this. The first part uses the Cognito Forms API to pull JSON copies of ACMG My Profile forms to local files in `./profile_data`. 
The other part is a routine that consumes the local files and runs the conversion process (`./util/parseAll`).

### Getting the Profile JSON Files

A Cognito Forms API key is needed to access the ACMG My Profile form data api. 

Once acquired, it needs to be set in the shell environment: 

    export cognito_api_key=<value>

See the [fetch_cognito_profiles.sh](./util/fetch_cognito_profiles.sh) script for insight.

Once this is configured, determine the range of the row numbers in the ACMG My Profile form and
set that in the [fetch_cognito_profiles.sh](./util/fetch_cognito_profiles.sh) bash for loop. 
Something like `{1..3270}` would try to get every row object.

#### Refreshing a Sub-Set of the JSON Files

Sometime you just need to re-fetch things that have changes recently. For this case, filter
in the All Entries view by `Entry.updated` after a certain date. Then export this set as a 
worksheet and save it as `~/Downloads/recent_updates.xlsx`. 

Then you can run this worksheet through a parser to quickly grab the row numbers in a comma 
delimited set: 

    bun updateIdList.js | pbcopy

Then take that list and replace the bash for loop set with that. It looks something like:

    {3027,3026,3025...}

### Running the Conversion Routine

Running the conversion routine is simple:

    bun util/parseAll.js

Note that the conversion routine remasters the Excel workbooks produced and written to
`./public/data` on each run. 


#### Focusing on a Single Profile Problem

If  you are having trouble with a specific profile, there are two ways to focus on it. 
One way is to write a test around it (see next). The other way is to put the name of the 
file into the inspect property in the `parseAll.js` script. Then it will only process that 
one file:

    const inspect = '3027.json'

#### Test Suite

The tests are important: 

    bun test

Everything should pass.


#### Debugging

    bun --inspect-wait util/parseAll.js

Ensure that the Oven bun extension is installed in vscode. Then use the extension to start
the debug session. The debug tools in vscode have been shown to work with this project.

