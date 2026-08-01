# Privacy and local data

Dragonfire Lab can be used without an account. The roster and Saved Formation Library are separate documents stored in the current browser. Signing out does not erase either browser copy.

When account services are configured and a user signs in, roster and Saved Formation synchronization remain independent. A library is sent only after account initialization determines that the documents match, the account-only library is accepted locally, or the user explicitly chooses to save/use the browser library. Conflicts show counts, timestamps, and a short list of formation names; no silent merge occurs.

The account Saved Formation row contains the authenticated user's UUID as its private database key and the versioned library document. It does not store an email address. Exported libraries contain no user ID, email, access token, password, or Supabase configuration. The client uses a publishable Supabase key and never a service-role credential.

Row Level Security allows authenticated users to select, insert, update, and delete only the row whose `user_id` equals `auth.uid()`. There is no public or anonymous read policy. Browser edits continue while offline and retry after reconnect. A missing cloud table or sync error leaves the browser library available and does not reset or modify the roster.

Saved formation progression snapshots include ownership, Star Rank, Dragon Level, and active Habit Levels for the three selected dragons. Derived ratings, power, relationships, optimizer rank, result hashes, account email, and personal roster notes are not included.
