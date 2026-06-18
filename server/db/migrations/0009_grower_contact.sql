-- "Contact the grower" feature. Outbound-only contact details on the public
-- profile — these power mailto:/wa.me/instagram deep links. There is no
-- in-app messaging, so nothing here stores or relays messages.
--   whatsapp         → phone number (international format) for wa.me links
--   contactEmail     → public contact email, kept separate from the private
--                      Better-Auth login email so growers opt in explicitly
--   preferredContact → 'whatsapp' | 'email' | 'instagram' | NULL; sorts that
--                      method first in the contact sheet
ALTER TABLE profile ADD COLUMN whatsapp TEXT;
ALTER TABLE profile ADD COLUMN contactEmail TEXT;
ALTER TABLE profile ADD COLUMN preferredContact TEXT;
