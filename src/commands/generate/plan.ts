/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import * as fs from 'fs';
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { CompositeCall } from 'sf-composite-call';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

let RefsMap = new Map();
const planArray: unknown[] = [];

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
// TODO: replace the package name with your new package's name
const messages = Messages.loadMessages('@salesforce/plugin-template', 'plan');

export default class Plan extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx generate:plan -u myOrg@example.com -s ./QueryData/account-contact-oppty-plan.json -d ./GeneratedPlanData
    `
  ];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    name: flags.string({ char: 'n', description: messages.getMessage('nameFlagDescription') }),
    force: flags.boolean({ char: 'f', description: messages.getMessage('forceFlagDescription') }),
    source: flags.string({ char: 's', description: messages.getMessage('sourceFlagDescription') }),
    destination: flags.string({ char: 'd', description: messages.getMessage('destinationFlagDescription') }),
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;


  public async run(): Promise<AnyJson> {

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.org.getConnection();
    const filePath = this.flags.source ?? './queryData/querydata1.json';
    const fileName = this.flags.source.split('/').pop() ?? 'fullplan.json';
    
    this.ux.log(`Reading file at ${filePath}`);

    const rawData = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const seriliazedData = JSON.parse(rawData);

    const compositeCall = new CompositeCall({
      allOrNone: true,
      jsforceConnection: conn,
    });

    if(seriliazedData.queries){
      seriliazedData.queries.forEach((element) => {
        // eslint-disable-next-line no-console
        compositeCall.addQuery(element.query);
        delete element.query;
        planArray.push(element);
      });
    }

    const destinationPath = this.flags.destination ?? 'PlanData';

    this.ux.log(`Writing Plan file at ${destinationPath}/${fileName}`);
    fs.writeFileSync(`${destinationPath}/${fileName}`, JSON.stringify(planArray, null, '\t'));
    
    const result = await compositeCall.execute();

    if (!result) {
      throw new SfdxError(messages.getMessage('errorNoOrgResults', [this.org.getOrgId()]));
    }

    this.ux.log('Composite call successful, resolving refs if any');

    this.createJson(JSON.stringify(result), destinationPath);

    // Return an object to be displayed with --json
    return { orgId: this.org.getOrgId() };
  }

  private createJson(result: string, destinationPath: string): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const myResult = JSON.parse(result)
    let counter = 0;
    myResult.compositeResponse.forEach((response) => {
      let jsObject = {records : []}
      // eslint-disable-next-line no-console
      if(response.body.done) {
        // eslint-disable-next-line no-console
        response.body.records = response.body.records.map((record, index) => {
          record = JSON.parse(this.modifyAttribute(JSON.stringify(record), `${planArray[counter]['sobject']}Ref${index}`, planArray[counter]['resolveRefs']))
          jsObject.records.push(record);
        });
      }
      let filepath = `${destinationPath}/${planArray[counter]['files'][0]}`;
      this.ux.log(`Writing at ${filepath}`);
      fs.writeFileSync(filepath, JSON.stringify(jsObject, null, '\t'));
      this.ux.log('Done');
      counter++;
    });
    
    return;
  }

  

  private modifyAttribute(recordStr: string, saveRefString: string, resolveRefs: boolean): string {
    let record = JSON.parse(recordStr);
    record.attributes.referenceId = saveRefString;
    delete record.attributes.url;
    

    if(record.Id) {
      RefsMap.set(record.Id, saveRefString)
      delete record.Id;
    }

    if(resolveRefs) {
      for(const property in record) {
        let id = record[property]
        if(typeof id !== 'object') {
          if(RefsMap.has(id)) {
            record[property] = `@${RefsMap.get(id)}`
          }
        }
      }
    }
    return JSON.stringify(record);
  }
}
