#!/bin/bash

# Initialize the project
cd "$(dirname "$0")"

# Create samples directory if running standalone
mkdir -p samples

# --- NON-COMPETE CLAUSES ---

cat > samples/001.input.txt << 'CLAUSE'
Employee agrees that for a period of twelve (12) months following termination of employment, Employee shall not directly or indirectly engage in any business that competes with the Company within a fifty (50) mile radius of any Company office.
CLAUSE
printf "non-compete" > samples/001.output.txt

cat > samples/002.input.txt << 'CLAUSE'
During the Restricted Period, the Receiving Party shall not, without prior written consent, participate in any enterprise that manufactures, sells, or distributes products substantially similar to those of the Disclosing Party.
CLAUSE
printf "non-compete" > samples/002.output.txt

cat > samples/003.input.txt << 'CLAUSE'
For twenty-four months after the closing date, Seller covenants not to own, manage, or operate any business engaged in activities competitive with the Business anywhere in the Territory.
CLAUSE
printf "non-compete" > samples/003.output.txt

# --- INDEMNIFICATION CLAUSES ---

cat > samples/004.input.txt << 'CLAUSE'
The Vendor shall indemnify, defend, and hold harmless the Client and its officers, directors, and employees from and against any and all claims, damages, losses, costs, and expenses arising out of or relating to any breach of this Agreement by the Vendor.
CLAUSE
printf "indemnification" > samples/004.output.txt

cat > samples/005.input.txt << 'CLAUSE'
Each party agrees to indemnify the other party against all liabilities, costs, expenses, damages and losses suffered or incurred by the indemnified party arising out of any breach of the warranties contained in this agreement.
CLAUSE
printf "indemnification" > samples/005.output.txt

cat > samples/006.input.txt << 'CLAUSE'
Contractor shall defend, indemnify and hold Company harmless from any third-party claims, suits, or proceedings alleging that the deliverables infringe any intellectual property right, and shall pay all damages finally awarded.
CLAUSE
printf "indemnification" > samples/006.output.txt

# --- LIMITATION OF LIABILITY CLAUSES ---

cat > samples/007.input.txt << 'CLAUSE'
In no event shall either party be liable to the other for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or the theory of liability, even if such party has been advised of the possibility of such damages.
CLAUSE
printf "limitation-of-liability" > samples/007.output.txt

cat > samples/008.input.txt << 'CLAUSE'
The total aggregate liability of the Service Provider under this Agreement shall not exceed the total fees paid by the Client during the twelve-month period immediately preceding the event giving rise to the claim.
CLAUSE
printf "limitation-of-liability" > samples/008.output.txt

cat > samples/009.input.txt << 'CLAUSE'
Neither party shall be liable for any loss of profits, revenue, data, or business opportunities, or for any exemplary or punitive damages arising under this contract, whether based on warranty, contract, tort, or any other legal theory.
CLAUSE
printf "limitation-of-liability" > samples/009.output.txt

# --- CHANGE OF CONTROL CLAUSES ---

cat > samples/010.input.txt << 'CLAUSE'
In the event of a Change of Control, defined as any merger, acquisition, or transfer of more than fifty percent (50%) of the voting securities of a party, the other party shall have the right to terminate this Agreement upon thirty (30) days written notice.
CLAUSE
printf "change-of-control" > samples/010.output.txt

cat > samples/011.input.txt << 'CLAUSE'
This Agreement may not be assigned by either party in connection with a change of control transaction without the prior written consent of the other party, which consent shall not be unreasonably withheld.
CLAUSE
printf "change-of-control" > samples/011.output.txt

cat > samples/012.input.txt << 'CLAUSE'
Upon a Change of Control event, all unvested stock options shall immediately vest and become exercisable. Change of Control means the acquisition by any person or group of beneficial ownership of more than 50% of the outstanding shares.
CLAUSE
printf "change-of-control" > samples/012.output.txt

# --- TERMINATION FOR CONVENIENCE CLAUSES ---

cat > samples/013.input.txt << 'CLAUSE'
Either party may terminate this Agreement at any time and for any reason, or for no reason at all, by providing the other party with ninety (90) days prior written notice of such termination.
CLAUSE
printf "termination-for-convenience" > samples/013.output.txt

cat > samples/014.input.txt << 'CLAUSE'
The Client reserves the right to terminate this contract for convenience at any time upon sixty (60) days written notice to the Contractor. Upon such termination, Contractor shall be compensated for all work completed to date.
CLAUSE
printf "termination-for-convenience" > samples/014.output.txt

cat > samples/015.input.txt << 'CLAUSE'
Notwithstanding any other provision, the Government may terminate performance of work under this contract in whole or in part if the Contracting Officer determines that a termination is in the Government best interest.
CLAUSE
printf "termination-for-convenience" > samples/015.output.txt

echo "Created 15 legal clause samples (3 per category)"
