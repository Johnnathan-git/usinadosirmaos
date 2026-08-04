const { createClient } = require('@supabase/supabase-js');
const url = "https://elvbtudbwpfxhsfnkzrm.supabase.co";
const key = "sb_publishable_oYI5HyhHNuqk9oduXzQyvw_I20B-UI3";
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, attachment_url')
    .not('attachment_url', 'is', null)
    .limit(5);
  console.log(JSON.stringify(data, null, 2));
}
check();
