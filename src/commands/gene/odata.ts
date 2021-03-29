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
const messages = Messages.loadMessages('@salesforce/plugin-template', 'odata');
/*
interface ResponseBody {
  totalSize: number;
  done: boolean;
  records: unknown;
}

interface IndividualResponse {
  body: ResponseBody;
  httpStatusCode: number;
  referenceId: string;
}

interface FinalResult {
  compositeResponse: IndividualResponse[];
}
*/
export default class Odata extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
  Hello world! This is org: MyOrg and I will be around until Tue Mar 20 2018!
  My hub org id is: 00Dxx000000001234
  `,
    `$ sfdx hello:org --name myname --targetusername myOrg@example.com
  Hello myname! This is org: MyOrg and I will be around until Tue Mar 20 2018!
  `,
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

    //  this.flags.targetusername = this.flags.source;

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this.ux.log(`source org name  : ${this.flags.source}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this.ux.log(`targetdevhubusername : ${this.flags.targetdevhubusername}`);

    // this.org is guaranteed because requiresUsername=true, as opposed to supportsUsername
    const conn = this.org.getConnection();
    const filePath = this.flags.source ?? './queryData/querydata1.json';
    const fileName = this.flags.source.split('/').pop() ?? 'fullplan.json';

    const rawData = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const seriliazedData = JSON.parse(rawData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const str = JSON.stringify(seriliazedData.queries[0].query);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this.ux.log(`source org name  : ${str}`);

    // const query = 'Select Id, Name, TrialExpirationDate from Organization';

    const compositeCall = new CompositeCall({
      allOrNone: true,
      jsforceConnection: conn,
    });

    

    if(seriliazedData.queries){
      seriliazedData.queries.forEach((element) => {
        // eslint-disable-next-line no-console
        console.log(element);
        compositeCall.addQuery(element.query);
        delete element.query;
        planArray.push(element);
      });
    }

    const destinationPath = this.flags.destination ?? 'PlanData';

    fs.writeFileSync(`${destinationPath}/${fileName}`, JSON.stringify(planArray, null, '\t'));

    // compositeCall.addQuery(query);
    
    const result = await compositeCall.execute();

    if (!result) {
      throw new SfdxError(messages.getMessage('errorNoOrgResults', [this.org.getOrgId()]));
    }
    this.createJson(JSON.stringify(result), destinationPath);
    const stringData = JSON.stringify(result, null, '\t');
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this.ux.log(`hi this is result  ${stringData}`);

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
      console.log(response)
      if(response.body.done) {
        // eslint-disable-next-line no-console
        console.log(response.body)
        response.body.records = response.body.records.map((record, index) => {
          console.log(counter, planArray[counter])
          record = JSON.parse(this.modifyAttribute(JSON.stringify(record), `${planArray[counter]['sObject']}Ref${index}`, planArray[counter]['resolveRefs']))
          jsObject.records.push(record);
        });
      }
      let filepath = `${destinationPath}/${planArray[counter]['files'][0]}`;
      fs.writeFileSync(filepath, JSON.stringify(jsObject, null, '\t'));
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
