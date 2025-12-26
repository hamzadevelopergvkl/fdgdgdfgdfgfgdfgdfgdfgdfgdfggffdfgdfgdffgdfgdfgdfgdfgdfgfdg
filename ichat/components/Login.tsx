import React, { useState } from 'react';
import { loginUser, registerUser, updateUserPublicKey } from '../services/api';
import { User } from '../types';
import { generateKeyPair, storePrivateKey, getPrivateKey } from '../services/encryption';

interface LoginProps {
    onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let data;
            if (isLoginMode) {
                data = await loginUser(email, password);
                
                // --- E2EE KEY RESTORATION LOGIC ---
                // Check if we have the private key for this user on this device
                const storedKey = await getPrivateKey();
                if (!storedKey) {
                    console.log("No private key found. Regenerating...");
                    // If not, we must generate a new pair to allow future E2EE
                    // Note: This means PREVIOUS messages sent to the OLD public key will remain unreadable
                    const keys = await generateKeyPair();
                    await storePrivateKey(keys.privateKey);
                    
                    // Update public key on server so others encrypt for this new key
                    await updateUserPublicKey(keys.publicKey);
                    
                    // Update the local user object with the new public key
                    data.user.publicKey = keys.publicKey;
                }
            } else {
                // Generate keys for E2EE on registration
                const keys = await generateKeyPair();
                await storePrivateKey(keys.privateKey);
                
                data = await registerUser(username, email, password, displayName, keys.publicKey);
            }

            // Save token
            localStorage.setItem('token', data.token);

            // Pass the user object directly
            onLogin(data.user);

        } catch (err: any) {
            if (err.response && err.response.data && err.response.data.msg) {
                setError(err.response.data.msg);
            } else if (err.request) {
                setError('Unable to connect to server. Is the backend running?');
            } else {
                setError('Authentication failed. Please try again.');
            }
            console.error("Login Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const isButtonEnabled = isLoginMode
    ? (email.length > 0 && password.length >= 6)
    : (username.length > 0 && email.length > 0 && password.length >= 6 && displayName.length > 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col font-sans transition-colors">
        <main className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-[850px] justify-center gap-8 items-center">
        {/* Phone Mockup - Hidden on smaller screens */}
        <div className="hidden lg:block relative w-[380px] h-[580px]">
        <div className="relative w-full h-full bg-black rounded-[45px] border-[8px] border-black shadow-xl overflow-hidden ring-4 ring-gray-100 dark:ring-zinc-800">
        <img src="https://picsum.photos/364/564?random=15" className="w-full h-full object-cover opacity-95" alt="App Preview" />
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-black rounded-b-2xl z-20"></div>
        </div>
        </div>

        {/* Login/Register Section */}
        <div className="flex flex-col w-[350px] flex-shrink-0 space-y-3">

        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 flex flex-col items-center py-10 px-10">
        <h1 className="text-5xl mb-6 text-gray-800 dark:text-white" style={{fontFamily: "'Grand Hotel', cursive"}}>Shadow</h1>

        {error && <div className="text-red-500 text-xs mb-4 text-center font-semibold bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-1.5">
        {!isLoginMode && (
            <div className="relative group">
            <input
            type="text"
            placeholder="Username"
            className="w-full text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-[3px] px-2 py-[9px] focus:border-gray-400 dark:text-white focus:outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            />
            </div>
        )}
        <div className="relative group">
        <input
        type="text"
        placeholder="Email"
        className="w-full text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-[3px] px-2 py-[9px] focus:border-gray-400 dark:text-white focus:outline-none"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        />
        </div>
        {!isLoginMode && (
            <div className="relative group">
            <input
            type="text"
            placeholder="Full Name"
            className="w-full text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-[3px] px-2 py-[9px] focus:border-gray-400 dark:text-white focus:outline-none"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            />
            </div>
        )}
        <div className="relative group">
        <input
        type="password"
        placeholder="Password"
        className="w-full text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-[3px] px-2 py-[9px] focus:border-gray-400 dark:text-white focus:outline-none"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        />
        </div>

        <button
        type="submit"
        disabled={!isButtonEnabled || isLoading}
        className={`
            w-full bg-[#0095f6] text-white text-sm font-semibold rounded-[8px] py-[7px] mt-4
            ${!isButtonEnabled ? 'opacity-70 cursor-default' : 'hover:bg-[#1877f2]'}
            flex justify-center items-center h-[32px] transition-all
            `}
            >
            {isLoading ? 'Loading...' : (isLoginMode ? 'Log in' : 'Sign up')}
            </button>
            </form>

            <div className="flex items-center w-full my-5">
            <div className="h-[1px] bg-gray-300 dark:bg-zinc-700 flex-1"></div>
            <div className="px-4 text-[13px] font-semibold text-gray-500 uppercase">Or</div>
            <div className="h-[1px] bg-gray-300 dark:bg-zinc-700 flex-1"></div>
            </div>

            <a href="#" className="text-xs text-[#00376b] dark:text-blue-400 hover:text-black dark:hover:text-white transition-colors">Forgot password?</a>
            </div>

            {/* Toggle Mode Card */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 py-5 text-center">
            <p className="text-sm m-0 dark:text-gray-300">
            {isLoginMode ? "Don't have an account?" : "Have an account?"}{" "}
            <button
            onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
            className="text-[#0095f6] font-semibold hover:text-[#1877f2]"
            >
            {isLoginMode ? "Sign up" : "Log in"}
            </button>
            </p>
            </div>

            {/* App Store Links */}
            <div className="text-center">
            <p className="text-sm my-4 text-gray-800 dark:text-white">Get the app.</p>
            <div className="flex justify-center space-x-2">
            <img
            src="https://static.cdninstagram.com/rsrc.php/v3/yt/r/Yfc020c87j0.png"
            alt="Download on the App Store"
            className="h-[40px] cursor-pointer hover:opacity-80 transition-opacity"
            />
            <img
            src="https://static.cdninstagram.com/rsrc.php/v3/yz/r/c5Rp7Ym-Klz.png"
            alt="Get it on Google Play"
            className="h-[40px] cursor-pointer hover:opacity-80 transition-opacity"
            />
            </div>
            </div>
            </div>
            </div>
            </main>

            {/* Footer */}
            <footer className="px-4 mb-12">
            <div className="flex justify-center items-center gap-4 text-xs text-gray-500">
            <span>© 2024 Shadow</span>
            </div>
            </footer>
            </div>
    );
};

export default Login;