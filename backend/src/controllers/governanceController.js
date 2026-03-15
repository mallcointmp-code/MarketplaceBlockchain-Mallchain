const axios = require('axios');
const CHAIN_REST = process.env.CHAIN_REST || 'http://127.0.0.1:1317';

function normalizeProposal(p) {
  if (!p) return null;
  const title = p.content?.title || p.title || 'Untitled proposal';
  const summary = p.content?.summary || p.description || p.content?.description || '';
  const status = p.status || 'PROPOSAL_STATUS_UNSPECIFIED';
  const tally = p.final_tally_result || p.tally || {};
  return {
    id: p.id,
    status,
    title,
    summary,
    submitTime: p.submit_time || p.submitTime,
    votingEndTime: p.voting_end_time || p.votingEndTime,
    totalDeposit: p.total_deposit || p.totalDeposit || [],
    tally: {
      yes: tally.yes || tally.yes_count || '0',
      no: tally.no || tally.no_count || '0',
      abstain: tally.abstain || tally.abstain_count || '0',
      veto: tally.no_with_veto || tally.no_with_veto_count || '0'
    }
  };
}

async function fetchTally(id) {
  try {
    const base = CHAIN_REST.replace(/\/$/, '');
    const url = `${base}/cosmos/gov/v1beta1/proposals/${id}/tally`;
    const r = await axios.get(url, { timeout: 3000 });
    const tr = r.data?.tally || r.data?.tally_result || r.data || {};
    return {
      yes: tr.yes || tr.yes_count || '0',
      no: tr.no || tr.no_count || '0',
      abstain: tr.abstain || tr.abstain_count || '0',
      veto: tr.no_with_veto || tr.no_with_veto_count || '0'
    };
  } catch (e) {
    return null;
  }
}

async function fetchProposalsAnyVersion() {
  const base = CHAIN_REST.replace(/\/$/, '');
  const endpoints = [
    `${base}/cosmos/gov/v1/proposals`,
    `${base}/cosmos/gov/v1beta1/proposals`
  ];
  for (const url of endpoints) {
    try {
      const r = await axios.get(url, { timeout: 4000 }).catch(() => null);
      if (r && r.data && (r.data.proposals || r.data.proposal)) {
        return { proposals: r.data.proposals || [r.data.proposal], pagination: r.data.pagination || {}, source: url.includes('v1beta1') ? 'v1beta1' : 'v1' };
      }
    } catch (e) {
      // try next
    }
  }
  return { proposals: [], pagination: {}, source: 'unavailable' };
}

exports.listProposals = async (req, res) => {
  try {
    const base = CHAIN_REST.replace(/\/$/, '');
    const { proposals, pagination, source } = await fetchProposalsAnyVersion();

    // Normalize and attach live tallies for the first few proposals
    const normalized = await Promise.all(proposals.slice(0, 10).map(async (p) => {
      const n = normalizeProposal(p);
      if (!n) return null;
      const liveTally = await fetchTally(p.id);
      if (liveTally) n.tally = liveTally;
      return n;
    }));

    res.json({ proposals: normalized.filter(Boolean), pagination: pagination || {}, source });
  } catch (e) {
    console.error('governance proposals error:', e.message);
    // Return fallback response instead of 500
    res.json({ proposals: [], pagination: {}, source: 'fallback' });
  }
};

exports.getProposal = async (req, res) => {
  try {
    const base = CHAIN_REST.replace(/\/$/, '');
    const urls = [
      `${base}/cosmos/gov/v1/proposals/${req.params.id}`,
      `${base}/cosmos/gov/v1beta1/proposals/${req.params.id}`
    ];
    let resp = null;
    for (const url of urls) {
      resp = await axios.get(url, { timeout: 3000 }).catch(() => null);
      if (resp) break;
    }
    if (!resp) return res.status(404).json({ error: 'proposal_not_found' });

    const proposal = normalizeProposal(resp.data?.proposal || resp.data);
    const tally = await fetchTally(req.params.id);
    if (proposal && tally) proposal.tally = tally;

    return res.json({ proposal, raw: resp.data });
  } catch (e) {
    console.error('government proposal error:', e.message);
    res.status(404).json({ error: 'proposal_not_found' });
  }
};

exports.vote = async (req, res) => {
  // Voting requires a signed transaction from the client wallet.
  // This endpoint documents the expected payload and can be used to forward tx_bytes.
  try {
    const { txBytes, mode } = req.body || {};
    if (!txBytes) {
      return res.status(400).json({
        ok: false,
        error: 'tx_bytes_required',
        hint: 'Sign MsgVote on the client and POST { txBytes: base64, mode?: BROADCAST_MODE_SYNC }'
      });
    }

    const broadcastUrl = `${CHAIN_REST.replace(/\/$/, '')}/cosmos/tx/v1beta1/txs`;
    const payload = { tx_bytes: txBytes, mode: mode || 'BROADCAST_MODE_SYNC' };
    const r = await axios.post(broadcastUrl, payload, { timeout: 5000 });
    return res.json({ ok: true, txResponse: r.data });
  } catch (e) {
    console.error('governance vote broadcast error:', e.message);
    return res.status(500).json({ ok: false, error: 'broadcast_failed', detail: e.message });
  }
};
