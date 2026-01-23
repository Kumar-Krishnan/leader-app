CREATE OR REPLACE FUNCTION public.check_allowed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  allowed_emails TEXT[] := ARRAY[
    'joshirby@gmail.com',
    'gkrishnan803@gmail.com',
    'joshirby1@usertest.com',
    'joshirby2@usertest.com',
    'gkrishnan803@usertest.com',
    'meredith.stuart+leader@leaderimpact.com',
    'meredith.stuart+member@leaderimpact.com'
  ];
BEGIN
  IF NOT (NEW.email = ANY(allowed_emails)) THEN
    RAISE EXCEPTION 'Email not authorized for signup. Contact administrator.';
  END IF;
  RETURN NEW;
END;
$function$;
