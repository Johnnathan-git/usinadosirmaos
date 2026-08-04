const { createClient } = require('@supabase/supabase-js');
const url = "https://elvbtudbwpfxhsfnkzrm.supabase.co";
const key = "sb_publishable_oYI5HyhHNuqk9oduXzQyvw_I20B-UI3";
const supabase = createClient(url, key);

async function check() {
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    console.log("=== BUCKETS ===");
    console.log(JSON.stringify(buckets, null, 2));
    if (bError) console.error("Buckets Error:", bError);

    const { data: invoices, error: iError } = await supabase
      .from('invoices')
      .select('id, attachment_url')
      .not('attachment_url', 'is', null)
      .limit(20);
    console.log("\n=== INVOICES WITH ATTACHMENTS ===");
    console.log(JSON.stringify(invoices, null, 2));
    if (iError) console.error("Invoices Error:", iError);
  } catch (e) {
    console.error("Execution error:", e);
  }
}

check();
