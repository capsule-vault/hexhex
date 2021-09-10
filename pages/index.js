import Head from 'next/head';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { ethers } from 'ethers';
import BncOnboard from 'bnc-onboard';

import lootAbi from '../Loot.json';
import hexHexAbi from '../HexHex.json';

const providerWithoutSigner = new ethers.providers.AlchemyProvider(
  Number(process.env.NEXT_PUBLIC_NETWORK_ID),
  process.env.NEXT_PUBLIC_RPC_URL.split('/').pop(),
);

const contractExecuter =
  (contract, method, ...args) =>
  () =>
    contract[method](...args);

const Home = () => {
  const ref = useRef({
    onboard: null,
    provider: providerWithoutSigner,
    loot: new ethers.Contract(
      process.env.NEXT_PUBLIC_LOOT_ADDRESS,
      lootAbi,
      providerWithoutSigner,
    ),
    hexHex: new ethers.Contract(
      process.env.NEXT_PUBLIC_HEXHEX_ADDRESS,
      hexHexAbi,
      providerWithoutSigner,
    ),
  });

  const [address, setAddress] = useState('');

  const { data: lootBalance } = useSWR(
    address && `/loot/balanceOf/${address}`,
    contractExecuter(ref.current.loot, 'balanceOf', address),
    { fallbackData: ethers.constants.Zero, refreshInterval: 10000 },
  );
  const { data: lootIds } = useSWR(
    lootBalance.gt(0) && address && `/loot/tokenIds/${address}`,
    () =>
      Promise.all(
        new Array(lootBalance.toNumber())
          .fill(null)
          .map((_, idx) =>
            contractExecuter(
              ref.current.loot,
              'tokenOfOwnerByIndex',
              address,
              idx,
            )(),
          ),
      ),
    { fallbackData: [], refreshInterval: 10000 },
  );
  const { data: hexHexIsClaimedByLootIds } = useSWR(
    lootIds.length > 0 && address && `/hexHex/isClaimeds/${address}`,
    () =>
      Promise.all(
        lootIds.map(async (lootId) => {
          const isClaimed = await contractExecuter(
            ref.current.hexHex,
            'isClaimedByLootId',
            lootId,
          )();
          return { lootId, isClaimed };
        }),
      ),
    { fallbackData: [], refreshInterval: 10000 },
  );
  const numRemainingClaimableTokensForAddress = useMemo(
    () => hexHexIsClaimedByLootIds.filter(({ isClaimed }) => !isClaimed).length,
    [hexHexIsClaimedByLootIds],
  );

  const { data: hexHexMaxSupply } = useSWR(
    '/hexHex/maxSupply',
    contractExecuter(ref.current.hexHex, 'maxSupply'),
    { fallbackData: ethers.constants.Zero },
  );
  const { data: hexHexMaxSupplyClaimable } = useSWR(
    '/hexHex/maxSupplyClaimable',
    contractExecuter(ref.current.hexHex, 'maxSupplyClaimable'),
    { fallbackData: ethers.constants.Zero },
  );
  const { data: hexHexNextMintableTokenId } = useSWR(
    '/hexHex/nextMintableTokenId',
    contractExecuter(ref.current.hexHex, 'nextMintableTokenId'),
    { fallbackData: ethers.constants.Zero, refreshInterval: 1000 },
  );

  const { data: hexHexPrice } = useSWR(
    '/hexHex/price',
    contractExecuter(ref.current.hexHex, 'price'),
    { fallbackData: ethers.utils.parseUnits('1') },
  );

  const connect = useCallback(async (walletName) => {
    const isSelected = await ref.current.onboard.walletSelect(walletName);
    if (isSelected) {
      await ref.current.onboard.walletCheck();
    }
  }, []);
  const disconnect = useCallback(() => {
    ref.current.onboard.walletReset();
    ref.current.provider = providerWithoutSigner;
    ref.current.loot = new ethers.Contract(
      process.env.NEXT_PUBLIC_LOOT_ADDRESS,
      lootAbi,
      providerWithoutSigner,
    );
    ref.current.hexHex = new ethers.Contract(
      process.env.NEXT_PUBLIC_HEXHEX_ADDRESS,
      hexHexAbi,
      providerWithoutSigner,
    );
    setAddress('');
  }, []);

  useEffect(() => {
    ref.current.onboard = BncOnboard({
      dappId: process.env.NEXT_PUBLIC_BN_API_KEY,
      networkId: Number(process.env.NEXT_PUBLIC_NETWORK_ID),
      subscriptions: {
        address: (address) => {
          if (address) {
            setAddress(address);
          } else {
            disconnect();
            // window.localStorage.removeItem('wallet');
          }
        },
        network: (networkId) => {
          if (
            networkId &&
            networkId !== Number(process.env.NEXT_PUBLIC_NETWORK_ID)
          ) {
            // TODO:
          } else {
            // TODO:
          }
        },
        wallet: (wallet) => {
          if (wallet?.provider) {
            const provider = new ethers.providers.Web3Provider(wallet.provider);
            const signer = provider.getSigner();
            ref.current.loot = new ethers.Contract(
              process.env.NEXT_PUBLIC_LOOT_ADDRESS,
              lootAbi,
              signer,
            );
            ref.current.hexHex = new ethers.Contract(
              process.env.NEXT_PUBLIC_HEXHEX_ADDRESS,
              hexHexAbi,
              signer,
            );
            window.localStorage.setItem('wallet', wallet.name);
          }
        },
      },
      walletSelect: {
        wallets: [
          { walletName: 'metamask', preferred: true },
          // {
          //   walletName: 'walletConnect',
          //   rpc: {
          //     [Number(process.env.NEXT_PUBLIC_NETWORK_ID)]: process.env.NEXT_PUBLIC_RPC_URL,
          //   },
          //   preferred: true,
          // },
        ],
      },
      walletCheck: [{ checkName: 'connect' }, { checkName: 'network' }],
    });
    const walletName = window.localStorage.getItem('wallet');
    if (walletName) {
      connect(walletName);
    }
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const handleCtaBtnClick = useCallback(async () => {
    if (!address) {
      await connect();
    } else {
      if (numRemainingClaimableTokensForAddress > 0) {
        const gasLimit = await ref.current.hexHex.estimateGas.claim(
          address,
          hexHexIsClaimedByLootIds.find(({ isClaimed }) => !isClaimed).lootId,
        );
        await ref.current.hexHex.claim(
          address,
          hexHexIsClaimedByLootIds.find(({ isClaimed }) => !isClaimed).lootId,
          { gasLimit: Math.floor(1.2 * gasLimit) },
        );
      } else {
        const gasLimit = await ref.current.hexHex.estimateGas.mint(address, {
          value: hexHexPrice,
        });
        await ref.current.hexHex.mint(address, {
          gasLimit: Math.floor(1.2 * gasLimit),
          value: hexHexPrice,
        });
      }
    }
  }, [
    address,
    connect,
    numRemainingClaimableTokensForAddress,
    hexHexIsClaimedByLootIds,
    hexHexPrice,
  ]);

  const hexHexes = useMemo(
    () =>
      new Array(3).fill(null).map(() =>
        new Array(6).fill(null).map(
          () =>
            `#${Math.floor(Math.random() * 16 ** 6)
              .toString(16)
              .padStart(6, '0')
              .toUpperCase()}`,
        ),
      ),
    [],
  );

  return (
    <>
      <Head>
        <title>HexHex</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header
        className="flex flex-col sm:flex-row justify-between items-center container mx-auto py-8 text-[26px]"
        style={{ fontFamily: 'Academy Engraved LET' }}
      >
        <div className="">HexHex</div>
        <div className="flex flex-col sm:flex-row justify-center items-center">
          <a href="https://opensea.io" target="_blank" rel="noreferrer">
            Opensea
          </a>
          <a
            className="sm:pl-16"
            href="https://twitter.com/HexHexToken"
            target="_blank"
            rel="noreferrer"
          >
            Twitter
          </a>
          <a
            className="sm:pl-16"
            href="https://etherscan.io"
            target="_blank"
            rel="noreferrer"
          >
            Contract
          </a>
        </div>
      </header>

      <main className="container mx-auto">
        <div className="flex flex-col items-center text-center">
          <h1
            className="text-[80px]"
            style={{
              fontFamily: 'Academy Engraved LET',
            }}
          >
            HexHex (beyond colors)
          </h1>
          <p
            className="mt-4 text-[26px]"
            style={{
              fontFamily: 'Academy Engraved LET',
            }}
          >
            HexHex (beyond colors) is a collection of 16,000 arrays of 6
            hexadecimal codes stored on chain.
            <br />
            Images and other functionality are intentionally omitted for others
            to interpret.
          </p>
          <p className="mt-4 text-[16px]" style={{ fontFamily: 'Andale Mono' }}>
            /<br />
            HexHex #0 to #7999 are claimable by loot owners for free for just
            gas,
            <br />
            and #8000 to #15999 are mintable by anyone for 0.01 ETH each.
          </p>
          <p className="mt-4 text-[16px]" style={{ fontFamily: 'Andale Mono' }}>
            /<br />
            The combination is conventionally utilized to represent a single
            shade of color.
            <br />
            The maximum possible characters in a single character is 16: from
            0-9 and A-F.
            <br />
            In standard #RRGGBB notation, there are thus 256^3 color
            combinations available, or 16,777,216.
            <br />
            Try copy, paste, and search on Google any of the Hex codes!
          </p>
          <p className="mt-2 text-[16px]" style={{ fontFamily: 'Andale Mono' }}>
            /<br />
            Any data, however, could potentially be remapped to these
            combinations, beyond colors.
            <br />
            The possible amount of unique HexHex is 256^3^6 = 2.23e+43, or more
            than 1 trillion squared.
          </p>
          <div className="my-10">
            <button
              className="relative flex justify-center items-center w-72 h-20 mb-2"
              onClick={handleCtaBtnClick}
            >
              <div className="absolute left-0 top-0 right-0 bottom-0 bg-black rounded-full filter hover:blur-md"></div>
              <div
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[26px] uppercase"
                style={{ fontFamily: 'Andale Mono' }}
              >
                {address
                  ? numRemainingClaimableTokensForAddress > 0
                    ? 'Claim'
                    : 'Mint'
                  : 'Connect'}
              </div>
            </button>
            <div style={{ fontFamily: 'Andale Mono' }}>{`${
              numRemainingClaimableTokensForAddress > 0
                ? `${numRemainingClaimableTokensForAddress} left`
                : `${hexHexMaxSupply
                    .sub(hexHexNextMintableTokenId)
                    .toNumber()}/${hexHexMaxSupply
                    .sub(hexHexMaxSupplyClaimable)
                    .toNumber()} left`
            } `}</div>
          </div>
        </div>
        <div>
          <div
            className="mb-2 text-[16px] text-center"
            style={{ fontFamily: 'Andale Mono' }}
          >
            Example HexHex:
          </div>
          <div
            className="grid grid-cols-3 gap-8 sm:px-32"
            style={{ fontFamily: 'Andale Mono' }}
          >
            {hexHexes.map((hexes) => (
              <div
                key={hexes[0]}
                className="relative col-span-3 sm:col-span-1 bg-black pt-[100%]"
              >
                <div className="absolute inset-0 px-10 py-8">
                  {hexes.map((hex) => (
                    <div key={hex} className="mb-2 text-[16px]">
                      {hex}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer
        className="container mx-auto py-8 text-[26px] text-center"
        style={{ fontFamily: 'Academy Engraved LET' }}
      >
        HexHex
      </footer>
    </>
  );
};

export default Home;
