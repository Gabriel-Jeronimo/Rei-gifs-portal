import React, { useEffect, useState } from 'react'
import twitterLogo from './assets/twitter-logo.svg';
import reiIcon from './assets/rei-icon.png';

import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json'

const { SystemProgram} = web3;



// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}


// Constants
const TWITTER_HANDLE = 'hereJers';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [programAccount, setProgramAccount] = useState(null);
  const [programBump, setProgramBump] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({onlyIfTrusted: true})
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          )
          setWalletAddress(response.publicKey.toString())
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;
  
    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const getPda = async () => {
    const [baseAccount, baseAccountBump] = await web3.PublicKey.findProgramAddress(
      [Buffer.from("base_account")],
      programID
    );
    setProgramAccount(baseAccount);
    setProgramBump(baseAccountBump);
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff(programBump, {
        accounts: {
          baseAccount: programAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [programAccount]
      });
      await getGifList();
    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

const sendGif = async () => {
  if (inputValue.length === 0) {
    console.log("No gif link given!")
    return
  }
  setInputValue('');
  console.log('Gif link:', inputValue);
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    await program.rpc.addGif(inputValue, {
      accounts: {
        baseAccount: programAccount,
        user: provider.wallet.publicKey,
      },
    });
    console.log("GIF successfully sent to program", inputValue)

    await getGifList();
  } catch (error) {
    console.log("Error sending GIF:", error)
  }
};

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(programAccount);      
      setGifList(account.gifList)
  
    } catch (error) {
      console.log("Error in getGifList: ", error)
      setGifList(null);
    }
  }

  const upvoteGif = async (id) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.upvote(id, {
        accounts: {
          baseAccount: programAccount
        }
      })
    } catch (err) {
      console.error("Upvote gif error: ", err);
    }
  }

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  )

  const renderConnectedContainer = () => {
// If we hit this, it means the program account hasn't been initialized.
  if (gifList === null) {
    return (
      <div className="connected-container">
        <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div>
    )
  } 
	// Otherwise, we're good! Account exists. User can submit GIFs.
	else {
    return(
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        <div className="gif-grid">
					{/* We use index as the key instead, also, the src is now item.gifLink */}
          {gifList.map((item, index) => (
            <div className="gif-item" key={index}>
              <img src={item.gifLink} />
              {console.log(item.votes)}
              {/* <button className="upvotetn" onClick={() => upvoteGif(item.id)}>upvote</button>
              <p>{item.votes}</p> */}
            </div>
          ))}
        </div>
      </div>
    )
  }
}

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList()
    }
  }, [walletAddress]);

  useEffect(() => {
    getPda();

  }, [])

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">
            {/* <img src={reiIcon} /> */}
            BEST EVA GIRL GIFS
          </p>
          <p className="sub-text">
            A Rei Ayanami Gif collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
          <div className={walletAddress ? 'authed-container' : 'container'}></div>
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
