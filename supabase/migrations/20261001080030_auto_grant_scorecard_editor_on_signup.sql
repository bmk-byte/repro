/*
  # Auto-grant is_scorecard_editor on signup for the confirmed scorecard admins

  Extends the existing auto_grant_moderator_to_approved_emails() BEFORE
  INSERT trigger (fires once, at profile creation, never on UPDATE — so this
  cannot clobber a later admin_set_scorecard_editor() grant to some other
  editor) so the two confirmed scorecard-editor emails that haven't signed
  up for Repropulse yet (mukone@afyanahaki.org, ssebibubbu@afyanahaki.org)
  get is_scorecard_editor set automatically when they do, rather than
  silently missing it until someone remembers to grant it by hand.
  kuteesa@afyanahaki.org already has a profile and was granted directly in
  20260929160000_create_scorecard_schema.sql.
*/

CREATE OR REPLACE FUNCTION public.auto_grant_moderator_to_approved_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.email IN (
    'litigation@wlsazim.co.zw',
    'snamuganza@womenwithmission.org',
    'hnalubega@iwilap.org',
    'rochuli@spi-hub.org',
    'ajalo@cehurd.org',
    'serwanjjasolomon@gmail.com',
    'veronicamercyamito@gmail.com',
    'jovia7@gmail.com',
    'hajara@femmeforteug.org',
    'ubuntujusticecentre@gmail.com',
    'dkibira@gmail.com',
    'programs.coswak@gmail.com',
    'litigation@kelinkenya.org',
    'lamole.hailey@gmail.com',
    'tadalamtambo@vitalrightsfoundation.com',
    'kevinobede@gmail.com',
    'mhlaba@wag.org.zw'
  ) OR NEW.email LIKE '%@afyanahaki.org' THEN
    NEW.is_moderator := true;
    NEW.role := coalesce(nullif(NEW.role, 'user'), 'expert');
  ELSE
    NEW.is_moderator := false;
  END IF;

  IF NEW.email IN (
    'kuteesa@afyanahaki.org',
    'sendaula@afyanahaki.org',
    'chaciyo@afyanahaki.org'
  ) THEN
    NEW.is_admin := true;
  ELSE
    NEW.is_admin := false;
  END IF;

  IF NEW.email IN (
    'kuteesa@afyanahaki.org',
    'mukone@afyanahaki.org',
    'ssebibubbu@afyanahaki.org'
  ) THEN
    NEW.is_scorecard_editor := true;
  ELSE
    NEW.is_scorecard_editor := false;
  END IF;

  RETURN NEW;
END;
$function$;
