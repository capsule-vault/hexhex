import Head from 'next/head';

const Home = () => {
  return (
    <>
      <Head>
        <title>HexHex</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header
        className="flex justify-between items-center container mx-auto py-10 text-4xl"
        style={{ fontFamily: 'Academy Engraved LET' }}
      >
        <div>HexHex</div>
        <div className="flex justify-center items-center">
          <div>Opensea</div>
          <div className="pl-16">Twitter</div>
          <div className="pl-16">Contract</div>
        </div>
      </header>

      <main className="container mx-auto">
        <div className="flex flex-col items-center text-center">
          <h1
            className="mt-20 text-7xl"
            style={{
              fontFamily: 'Academy Engraved LET',
            }}
          >
            HexHex (beyond colors)
          </h1>
          <p
            className="mt-12 text-4xl"
            style={{
              fontFamily: 'Academy Engraved LET',
            }}
          >
            HexHex (beyond colors) is a collection of 6,666 arrays of 6
            hexadecimal codes stored on chain. Images and other functionality
            are intentionally omitted for others to interpret.
          </p>
          <p className="mt-12 text-lg" style={{ fontFamily: 'Andale Mono' }}>
            /<br />
            The combination is conventionally utilized to represent a single
            shade of color. the maximum possible characters in a single
            character is 16: from 0-9 and A-F. In standard #RRGGBB notation,
            there are thus 256^3 color combinations available, or 16,777,216.
          </p>
          <p className="mt-4 text-lg" style={{ fontFamily: 'Andale Mono' }}>
            /<br />
            Any data, however, could potentially be remapped to these
            combinations, beyond colors. The possible amount of unique HexHex is
            256^3^6 = 2.23e+43, or more than 1 trillion squared.
          </p>
          <button className="relative flex justify-center items-center w-72 h-20 my-12">
            <div className="absolute left-0 top-0 right-0 bottom-0 bg-black rounded-full filter hover:blur-md"></div>
            <div
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl uppercase"
              style={{ fontFamily: 'Andale Mono' }}
            >
              Mint
            </div>
          </button>
        </div>
        <div>
          <div
            className="mb-8 text-center"
            style={{ fontFamily: 'Andale Mono' }}
          >
            Example HexHex:
          </div>
          <div className="grid grid-cols-3 gap-4">
            {new Array(3)
              .fill(null)
              .map(() =>
                new Array(6).fill(null).map(
                  () =>
                    `#${Math.floor(Math.random() * 16 ** 6)
                      .toString(16)
                      .toUpperCase()}`,
                ),
              )
              .map((hexs, i) => (
                <div key={i} className="bg-black h-96 px-10 py-8">
                  {hexs.map((hex, j) => (
                    <div key={j} className="mb-2">
                      {hex}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </main>

      <footer
        className="container mx-auto py-8 text-4xl text-center"
        style={{ fontFamily: 'Academy Engraved LET' }}
      >
        HexHex
      </footer>
    </>
  );
};

export default Home;
