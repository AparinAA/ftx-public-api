import FTXclient from "../index";
import path from 'path';
import dotenv from 'dotenv';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            api_key: string;
            secret_key: string;
            password: string;
            ENV: 'test' | 'dev' | 'prod';
        }
    }
}

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Init secret api OKX
const secretDictFTX = {
    'apiKey': process.env.api_key,
    'secretKey': process.env.secret_key,
    'password': process.env.passwordWithdrawal
};

function check (ex: any) {
    return ex.getName();
} 

test('Check connect API to FTX', async () => {
    expect(await check(new FTXclient(secretDictFTX.apiKey, secretDictFTX.secretKey))).toBe("FTX");
})