import { AppleScriptRunner } from "../utils/apple-script.js";

/**
 * Contacts Application Integration
 * Provides functionality to search and manage macOS Contacts
 * Note: Contact modification requires careful handling due to system integration
 */
export class Contacts {
  /**
   * Search contact information
   * @param name - Contact name
   * @returns Contact details
   */
  async search(name: string): Promise<string> {
    return await AppleScriptRunner.execute(
      `
      tell application "Contacts"
        set thePerson to first person whose name contains "${name}"
        set theInfo to "Name: " & name of thePerson & "\\n"
        repeat with thePhone in phones of thePerson
          set theInfo to theInfo & "Phone (" & label of thePhone & "): " & value of thePhone & "\\n"
        end repeat
        repeat with theEmail in emails of thePerson
          set theInfo to theInfo & "Email (" & label of theEmail & "): " & value of theEmail & "\\n"
        end repeat
        return theInfo
      end tell
    `,
      "Contacts",
    );
  }

  /**
   * List all contacts (returns names only)
   * @param limit - Optional limit on number of contacts (default: 50)
   * @returns List of contact names
   */
  async list(limit: number = 50): Promise<string[]> {
    const result = await AppleScriptRunner.execute(
      `
      tell application "Contacts"
        set allPeople to every person
        set nameList to {}
        set counter to 0
        repeat with thePerson in allPeople
          if counter >= ${limit} then exit repeat
          copy name of thePerson to end of nameList
          set counter to counter + 1
        end repeat
        return nameList
      end tell
    `,
      "Contacts",
    );
    return AppleScriptRunner.parseList(result);
  }

  /**
   * Get detailed contact information by exact name
   * @param exactName - Exact contact name
   * @returns Detailed contact information
   */
  async getDetails(exactName: string): Promise<string> {
    return await AppleScriptRunner.execute(
      `
      tell application "Contacts"
        set thePerson to first person whose name is "${exactName}"
        set theInfo to "=== Contact Details ===\\n"
        set theInfo to theInfo & "Name: " & name of thePerson & "\\n"
        
        -- Organization
        try
          set theInfo to theInfo & "Organization: " & organization of thePerson & "\\n"
        end try
        
        -- Phones
        set theInfo to theInfo & "\\nPhones:\\n"
        repeat with thePhone in phones of thePerson
          set theInfo to theInfo & "  " & label of thePhone & ": " & value of thePhone & "\\n"
        end repeat
        
        -- Emails
        set theInfo to theInfo & "\\nEmails:\\n"
        repeat with theEmail in emails of thePerson
          set theInfo to theInfo & "  " & label of theEmail & ": " & value of theEmail & "\\n"
        end repeat
        
        -- Addresses
        set theInfo to theInfo & "\\nAddresses:\\n"
        repeat with theAddress in addresses of thePerson
          set theInfo to theInfo & "  " & label of theAddress & ": " & formatted address of theAddress & "\\n"
        end repeat
        
        return theInfo
      end tell
    `,
      "Contacts",
    );
  }

  /**
   * Search contacts by phone number
   * @param phoneNumber - Phone number to search for (partial match supported)
   * @returns Contact name and details
   */
  async searchByPhone(phoneNumber: string): Promise<string> {
    return await AppleScriptRunner.execute(
      `
      tell application "Contacts"
        try
          -- Filter people who have any phone whose value contains the target string
          set matchingPeople to every person whose (value of phones contains "${phoneNumber}")
          if (count of matchingPeople) is 0 then
            return "No contact found with phone number: ${phoneNumber}"
          end if
          
          set thePerson to item 1 of matchingPeople
          set theInfo to "Name: " & name of thePerson & "\\n"
          repeat with thePhone in phones of thePerson
            set theInfo to theInfo & "Phone (" & label of thePhone & "): " & value of thePhone & "\\n"
          end repeat
          return theInfo
        on error err
          return "Error: " & err
        end try
      end tell
    `,
      "Contacts",
    );
  }

  /**
   * Search contacts by email
   * @param email - Email address to search for
   * @returns Contact name and details
   */
  async searchByEmail(email: string): Promise<string> {
    return await AppleScriptRunner.execute(
      `
      tell application "Contacts"
        try
          set matchingPeople to every person whose (value of emails contains "${email}")
          if (count of matchingPeople) is 0 then
            return "No contact found with email: ${email}"
          end if
          
          set thePerson to item 1 of matchingPeople
          set theInfo to "Name: " & name of thePerson & "\\n"
          repeat with theEmail in emails of thePerson
            set theInfo to theInfo & "Email (" & label of theEmail & "): " & value of theEmail & "\\n"
          end repeat
          return theInfo
        on error err
          return "Error: " & err
        end try
      end tell
    `,
      "Contacts",
    );
  }
}
