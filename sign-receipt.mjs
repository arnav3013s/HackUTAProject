import { createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ensure, fetchJson } from './services.mjs';

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function fromBase58(value) {
  let integer = 0n;
  for (const character of value) {
    const index = alphabet.indexOf(character);
    ensure(index !== -1, 'Expected base58 data.');
    integer = integer * 58n + BigInt(index);
  }
  const bytes = [];
  while (integer) {
    bytes.unshift(Number(integer % 256n));
    integer /= 256n;
  }
  const zeros = value.match(/^1*/)[0].length;
  return Buffer.concat([Buffer.alloc(zeros), Buffer.from(bytes)]);
}

const memo = process.argv[2] || '';
ensure(/^patchline:[\w-]{43}$/.test(memo), 'Supply a Patchline receipt memo as the single argument.');
ensure(process.env.SOLANA_KEYPAIR_FILE && process.env.SOLANA_RECEIPT_AUTHORITY, 'Set SOLANA_KEYPAIR_FILE and SOLANA_RECEIPT_AUTHORITY.');
const keypair = JSON.parse(await readFile(process.env.SOLANA_KEYPAIR_FILE, 'utf8'));
ensure(Array.isArray(keypair) && keypair.length === 64 && keypair.every(value => Number.isInteger(value) && value >= 0 && value <= 255), 'Expected a Solana CLI keypair file.');
const privateKey = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(keypair.slice(0, 32))]), format: 'der', type: 'pkcs8' });
const publicKey = createPublicKey(privateKey).export({ format: 'der', type: 'spki' }).subarray(-32);
ensure(publicKey.equals(fromBase58(process.env.SOLANA_RECEIPT_AUTHORITY)), 'The keypair does not match the configured receipt authority.');

const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
async function rpc(method, params) {
  const response = await fetchJson(rpcUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  ensure(!response.error && response.result, response.error?.message || 'Solana RPC did not return a result.');
  return response.result;
}

const { value } = await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }]);
const hash = fromBase58(value.blockhash);
ensure(hash.length === 32, 'Solana returned an invalid blockhash.');
const memoProgram = fromBase58('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const memoBytes = Buffer.from(memo);
// Legacy Solana message with two account keys and one memo-only instruction.
const message = Buffer.concat([
  Buffer.from([1, 0, 1, 2]), publicKey, memoProgram, hash,
  Buffer.from([1, 1, 0, memoBytes.length]), memoBytes
]);
const transaction = Buffer.concat([Buffer.from([1]), sign(null, message, privateKey), message]);
const signature = await rpc('sendTransaction', [transaction.toString('base64'), { encoding: 'base64', preflightCommitment: 'confirmed' }]);
console.log(signature);
