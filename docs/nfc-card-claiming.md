# Registering and claiming NFC cards

In **NFC Cards → Assign NFC Card**, scan the physical card code into Card Code.
Leave Customer blank and choose **Register Unassigned Card** for event inventory.
Use the **Unassigned** filter to find cards awaiting a customer.
Choose a customer to assign the card immediately instead.

Unassigned cards require an expiration date, initially 30 days ahead. The selected
date ends at 23:59:59 UTC+8. Existing unassigned cards receive 30 days from the
expiration migration. Expired cards cannot be claimed or assigned, and a database
Cron job deletes up to 1,000 expired unassigned cards each minute. The admin list
refreshes every minute. Claiming or assigning a valid card clears its expiration.

The **Delete** action is available only for unassigned cards and requires
confirmation. The server checks ownership again while locking the card, so a card
claimed in the meantime cannot be deleted. Automatic and manual deletions are
recorded in audit logs. A deleted physical card can be registered again if needed.

The customer app must call this RPC with the customer's authenticated Supabase session:

```js
const { data: card, error } = await supabase.rpc('claim_nfc_card', {
  p_card_code: scannedCode,
})
```

The database accepts only registered ACTIVE cards and ACTIVE customer accounts.
The caller cannot supply an owner ID: ownership comes from their session.
A row lock serializes claims and admin assignments; a unique card-code constraint
prevents duplicate records. Retrying a claim by the existing owner succeeds;
another customer cannot claim an owned card. Admin reassignment uses the existing
Transfer operation. Account numbers remain on customer profiles.

This repository implements the admin website and backend RPC. The customer app
needs to connect its claim-card screen to the RPC above.

Scanner input supports readers that type the card code as keyboard input.
A scanner's trailing Enter does not automatically submit the registration form.
Phone NFC reading must pass the same physical card code to the RPC.
