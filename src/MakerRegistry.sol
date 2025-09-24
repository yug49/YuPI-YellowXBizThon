// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title MakerRegistry
 * @author Yug Agarwal
 * @dev The registry keeps the upi/proof mappings for all the makers to make them authorized users of this app
 *
 *                          .            .                                   .#                        
 *                        +#####+---+###+#############+-                  -+###.                       
 *                        +###+++####+##-+++++##+++##++####+-.         -+###+++                        
 *                        +#########.-#+--+####++###- -########+---+++#####+++                         
 *                        +#######+#+++--+####+-..-+-.###+++########+-++###++.                         
 *                       +######.     +#-#####+-.-------+############+++####-                          
 *                      +####++...     ########-++-        +##########++++++.                          
 *                     -#######-+.    .########+++          -++######+++-                               
 *                     #++########--+-+####++++-- . ..    .-#++--+##+####.                              
 *                    -+++++++++#####---###---.----###+-+########..-+#++##-                            
 *                    ++###+++++#####-..---.. .+##++++#++#++-+--.   .-++++#                             
 *                   .###+.  .+#+-+###+ ..    +##+##+#++----...---.  .-+--+.                            
 *                   ###+---------+####+   -####+-.......    ...--++.  .---.                           
 *                  -#++++-----#######+-  .-+###+.... .....      .-+##-.  .                            
 *                  ##+++###++######++-.   .--+---++---........  ...---.  .                            
 *                 -####+-+#++###++-.        .--.--...-----.......--..... .                            
 *                 +######+++###+--..---.....  ...---------------.. .. .  .                            
 *                .-#########+#+++--++--------......----++--.--.  .--+---.                             
 *                 -+++########++--++++----------------------.--+++--+++--                             
 *            .######-.-++++###+----------------------..---++--++-+++---..                             
 *            -##########-------+-----------------------+-++-++----..----+----+#####++--..             
 *            -#############+..  ..--..----------.....-+++++++++++++++++##################+.           
 *            --+++++#########+-   . ....  ....... -+++++++++++++++++++############-.----+##-          
 *            -----....-+#######+-             .. -+++++++++++++++++++++##+######+.       +++.         
 *            --------.....---+#####+--......----.+++++++++++++++++++++##+-+++##+.        -++-         
 *            -------...   .--++++++---.....-----.+++++++++++++++++++++++. -+++##-        .---         
 *            #################+--.....-------.  .+++++++++++++++++++++-       -+-.       .---         
 *            +#########++++-.. .......-+--..--++-++++++++++++++++++++-         .-... ....----         
 *            -#####++---..   .--       -+++-.  ..+++++++++++++++++++--        .-+-......-+---         
 *            +####+---...    -+#-   .  --++++-. .+++++++++++++++++++---        --        -+--         
 *            ++++++++++--....-++.--++--.--+++++-.+++++++++++++++++++---. .......         ----         
 *           .--++#########++-.--.+++++--++++###+-++++++++++++++++++++----   .-++-        ----         
 *            .-+#############+-.++#+-+-++#######-++++++++++++++++++++----   -++++-      ..---         
 *           .---+############+.+###++--++#####++-+++++++++++++++++++++-------++++-........-+-         
 *            --+-+##########-+######+++++-++++++-++++++++++++++++++++++-----.----.......---+-         
 *           .--+---#######..+#######+++++++--+++-+++++++++++++++++++++++-----------------+++-         
 *           .++--..-+##-.-########+++++---++ .+-.+++++++++++++++++++++++++++++++++++---+++++-         
 *           -+++. ..-..-+#########++-++--..--....+++++++++++++++++++++++++++++++++++++++++++-         
 *           -++-......-+++############++++----- .+++++++++++++++++++++++++++++++++++++++++++-         
 *           +##-.....---+#######+####+####+--++-.+++++++++++++++++++++++++++++++++++++++++++-         
 *          .#+++-...-++######++-+-----..----++##-+++++++++++++++++++++++++++++++++++++++++++-         
 *          .+++--------+##----+------+-..----+++-+++++++++++++++++++++++++++++++++++++++++++-         
 *           ----.-----+++-+-...------++-----...--+++++++++++++++++++++++++++++++++++++++++++-         
 *          .-..-.--.----..--.... ....++--.  ....-+++++++++++++++++++++++++++++++++++++++++++-         
 *           -----------.---..--..   ..+.  . ... .+++++++++++++++++++++++++++++++++++++++++++-         
 *         .+#+#+---####+-.    .....--...   .    .+++++++++++++++++++++++++++++++++++++++++++-         
 *         -+++++#++++++++.    ..-...--.. ..     .+++++++++++++++++++++++++++++++++++++++++++-         
 *         ++++++-------++--   . ....--.. . . .. .+++++++++++++++++++++++++-+----------...             
 *         -++++--++++.------......-- ...  ..  . .---------------...                                   
 *         -++-+####+++---..-.........                                                                  
 *           .....
 */
contract MakerRegistry is Ownable {
    error MakerRegistry__InvalidProof();
    error MakerRegistry__InvalidAddress();
    error MakerRegistry__AlreadyRegistered();
    error MakerRegistry__MakerNotRegisteredYet();

    mapping(address => bool) public s_isForiegner;
    mapping(address => string) public s_upiAddress;
    mapping(address => string) public s_proof;
    mapping(address => bool) public s_isRegistered;

    constructor() Ownable(msg.sender) {}

    /**
     *
     * @param _identityProof The identity proof or UPI address of the maker
     * @param _maker the maker address
     * @param _isForiegner whether the maker is a foreigner or not
     * @dev if the maker is a foreigner, they need to provide an identity proof
     */
    function registerMaker(string memory _identityProof, address _maker, bool _isForiegner) public onlyOwner {
        if (bytes(_identityProof).length == 0) {
            revert MakerRegistry__InvalidProof();
        }
        if (_maker == address(0)) {
            revert MakerRegistry__InvalidAddress();
        }
        if (s_isRegistered[_maker]) {
            revert MakerRegistry__AlreadyRegistered();
        }

        // Mark the maker as registered
        s_isRegistered[_maker] = true;

        if (_isForiegner) {
            s_isForiegner[_maker] = true;
            s_proof[_maker] = _identityProof;
        } else {
            s_upiAddress[_maker] = _identityProof;
        }
    }

    /**
     *
     * @param _maker The address of the maker whose proof is to be edited
     * @param _newProof The new proof or empty string if the maker wants to deregister
     * @dev if the maker wants to deregister, they can pass an empty string as _newProof
     */
    function editMaker(address _maker, string memory _newProof) public onlyOwner {
        if (_maker == address(0)) {
            revert MakerRegistry__InvalidAddress();
        }
        if (!s_isRegistered[_maker]) {
            revert MakerRegistry__MakerNotRegisteredYet();
        }

        if (bytes(_newProof).length == 0) {
            s_isForiegner[_maker] = false;
            s_upiAddress[_maker] = "";
            s_proof[_maker] = "";
            s_isRegistered[_maker] = false;
            return;
        }

        if (s_isForiegner[_maker]) {
            s_proof[_maker] = _newProof;
        } else {
            s_upiAddress[_maker] = _newProof;
        }
    }

    /**
     *
     * @param _maker The address of the maker whose proof is to be fetched
     * @return the proof
     * @return whether the maker is a foreigner
     */
    function getProof(address _maker) public view returns (string memory, bool) {
        if (!s_isRegistered[_maker]) {
            revert MakerRegistry__MakerNotRegisteredYet();
        }
        if (s_isForiegner[_maker]) {
            return (s_proof[_maker], true);
        } else {
            return (s_upiAddress[_maker], false);
        }
    }

    /**
     * @param _maker The address of the maker to check
     */
    function isMaker(address _maker) public view returns (bool) {
        return s_isRegistered[_maker];
    }
}
