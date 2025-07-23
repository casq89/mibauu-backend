# MIBAUU Backend

## This is the backen project of MIBAUU based on supabase edge functions

## Steps to set up project in local

1. Install docker
2. Install Deno extension in VS Code
2. Clone repository in local environment.
3. run `yarn install` command
4. run `yarn supabase:login` command and follow steps to login through the browser
5. run `yarn supabase:list` command and take project ID
6. run `yarn supabase:link -- projectId` command to link project

If any issue please take a lokk at oficial Doc https://supabase.com/docs/guides/functions/deploy

Now project is ready to modify, create and publish new functions

## Create new function

Developer can create a new function with `yarn supabase:create -- my-function` command

## Publish one function functions

Developer can deploy only one specific function with `yarn supabase:deploy -- my-function` command

## Publish all functions

Developer can deploy all function with next command `yarn supabase:deploy`

## Star server locally to test functions

2. run `yarn supabase:start` command and wait until all data is
3. run `yarn supabase:local` command to init local server
