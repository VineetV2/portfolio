## about-approach
source: #s01 | Abstract
Vineet is drawn to problems where nobody has decided what to build yet. His work
typically means owning the whole line: scoping what is actually needed, building the
pipeline, standing up the infrastructure it runs on, and explaining the result to
people who do not care what a transformer is.

## about-philosophy
source: #s01 | Abstract
Vineet's stated working philosophy: a model is not finished when it converges — it is
finished when someone who did not build it can run it, trust it, and get an answer
under real constraints. He describes his approach as end-to-end ownership of
ambiguous problems, building systems that run in someone else's environment,
shipping over polishing, and knowing when to cut scope.

## thesis-pipeline
source: #s02 | Selected Work, Fig. 1
Vineet's master's thesis at NJIT (Jan 2026 – present) turns plain-English business
questions into working SQL against enterprise databases the model has never seen.
The pipeline has five stages: schema linking, candidate generation, targeted
decomposition, self-repair, and a consensus vote across candidates. The backbone
model is Qwen3-Coder-30B, an open-source model. The stack is Python, vLLM,
PyTorch, SLURM, and SQLite.

## thesis-accuracy
source: #s02 | Selected Work, Fig. 1
The thesis system reaches 70.2% execution accuracy on BIRD, a benchmark of 1,534
questions across 11 distinct real-world databases.

## thesis-open-source
source: #s02 | Selected Work, Fig. 1
The thesis system runs on open-source models only, with zero proprietary APIs. That
constraint is deliberate: it means the system can be deployed inside a company's own
environment with no data leaving it — the difference between a demo and something a
regulated customer can actually run.

## thesis-status
source: #s02 | Selected Work, Fig. 1
The thesis is in progress. Its code repository is not yet public.

## thesis-infrastructure
source: https://vineetvora.dev/Vineet_Vora.pdf | Résumé (PDF)
For the thesis, Vineet served 30B-parameter models on a 2×A100 SLURM cluster using
vLLM. He built checkpoint/resume, per-question timeouts, and graceful degradation so
that an eight-hour evaluation run never restarts from zero after a single failure.

## thesis-variant-cut
source: https://vineetvora.dev/Vineet_Vora.pdf | Résumé (PDF)
Vineet ran controlled comparisons across four open-source backbone models to isolate
what actually moved accuracy on the thesis system. He also cut five
candidate-selection variants down to one after measuring that the additional four
variants bought no accuracy gain.

## surya-overview
source: #s02 | Selected Work, Fig. 2
Since Dec 2025, Vineet has been adapting Surya, a 366M-parameter Vision Transformer
pretrained on NASA solar imagery, to forecast interplanetary magnetic field
conditions 72 hours out — the kind of signal utilities and satellite operators watch
before a geomagnetic storm. He compared a LoRA-adapted encoder against a frozen
encoder with a 3-layer MLP head on 13-channel AIA EUV and HMI magnetogram inputs at
512×512, using PyTorch, LoRA, CUDA, and Weights & Biases.

## surya-results
source: #s02 | Selected Work, Fig. 2
The frozen encoder won: it reached 3.39 nT RMSE using only 0.34% of trainable
parameters, and was 3.5× more efficient than the LoRA-adapted approach. Validated by
Leave-One-Flare-Out cross-validation across 57 M5.0+ and X-class solar flare events,
with 96.5% of folds completing successfully. Code is at
github.com/VineetV2/imf-bz-forecasting-surya.

## hadoop-overview
source: #s02 | Selected Work, Fig. 3
In Nov–Dec 2025, Vineet stood up a 6-node Hadoop cluster from bare AWS EC2 instances
and processed 22 years of US flight data with custom Java MapReduce jobs, tuning it
until map tasks read local data instead of pulling across the network.

## hadoop-results
source: #s02 | Selected Work, Fig. 3
The Hadoop project processed 118.9 million flight records (11.66 GB), reaching 100%
data-local map execution and a 2.73× speedup under scaling. Code is at
github.com/VineetV2/hadoop-flight-data-analysis.

## peon-overview
source: #s02 | Selected Work, Fig. 4
Peon is a local-first MCP server Vineet built and uses daily, giving AI coding agents
persistent project memory: capture as you work, LLM consolidation, hybrid retrieval,
and a daily self-audit. It ships as an MCP server, so it drops into any compatible
client rather than locking to one. Built in 2026 with TypeScript, MCP, and SQLite.
Code is at github.com/VineetV2/peon-mem.

## portfolio-site
source: #s02 | Selected Work, Fig. 5
This portfolio site itself is hand-written HTML, CSS, and JavaScript with no
framework and no build step for the site itself, though the repository now carries
dev dependencies for testing the Ask endpoint's Worker. Built in 2026, deployed on
Cloudflare Workers with static assets. Code is at github.com/VineetV2/portfolio.

## ask-endpoint
source: #s00 | Ask
The Ask box on this page is a Cloudflare Worker that calls Workers AI using
open-source models. The entire hand-curated corpus is placed in the model's context
on every request; the Worker deliberately does not use retrieval or a vector
database, because the corpus is small enough to fit in one context window and
retrieval would add failure modes without buying anything at this size. Citations
the model returns are validated server-side against real block ids, so an invented
citation cannot render. Questions about work authorisation, compensation, or
opinions on his fit are intercepted and answered with a fixed refusal reply before
the model is ever called.

## skills-languages-ml
source: #s03 | Methods
Vineet's languages: Python, TypeScript, Java, JavaScript, SQL. His AI and ML tools:
PyTorch, HuggingFace, vLLM, LoRA/PEFT, TensorFlow, scikit-learn, OpenCV.

## skills-infra-databases
source: #s03 | Methods
Data and infrastructure tools: Hadoop, MapReduce, HDFS, YARN, AWS EC2, SLURM, Docker,
CUDA. Databases: PostgreSQL, MySQL, MongoDB, SQLite.

## skills-web-delivery
source: #s03 | Methods
Web tools: React, Node.js, Cloudflare Workers. Delivery skills: requirements scoping,
Design Thinking (IBM), technical writing, Git, CI/CD.

## publication-overview
source: #s04 | Published
Vineet co-authored "Preventing Wildfires in Energy Transmission by Automatic Power
Line Defects Detection Using Machine Learning and AI," presented at the 2025 New
Jersey Future Energy Transmission Conference (NJFET), IEEE, in December 2025. It is a
computer vision framework for finding power line defects and vegetation encroachment
in UAV imagery, aimed at moving utilities from reactive repair to preventive
maintenance. Vineet presented it to a conference audience. It is published at
ieeexplore.ieee.org/document/11380637.

## publication-method
source: #s04 | Published
The paper's proof of concept detects falling wires using Canny edge detection and a
Probabilistic Hough Transform — that is what was actually built and evaluated. CNN,
YOLO, and transformer architectures are named only as future work, the roadmap toward
real-time inspection at scale; they were not implemented in this paper.

## education-njit
source: #s05 | Record
Vineet is pursuing an MS in Artificial Intelligence at the New Jersey Institute of
Technology (NJIT) in Newark, NJ, with a GPA of 3.83, expected in 2027. Coursework
includes Advanced NLP, Computer Vision, Information Retrieval, ML for Data Science,
and Big Data.

## education-vitap
source: #s05 | Record
Vineet holds a BTech in Computer Science from Vellore Institute of Technology — AP,
India, completed in 2025.

## certifications
source: #s05 | Record
Vineet holds four certifications: Enterprise Design Thinking Practitioner (IBM),
Practical GitHub Actions (LinkedIn Learning), Learning Docker (LinkedIn Learning), and
the Full-Stack Developer Program (Ethnus).

## contact-info
source: #s06 | Contact
Vineet can be reached at vineet.vora123@gmail.com. His code is at
github.com/VineetV2 and his professional profile is at linkedin.com/in/vineetv2. His
CV is available as a PDF from the site.

## availability-status
source: #cover | Cover
Vineet is based in Newark, New Jersey. His MS in Artificial Intelligence at NJIT is
expected in June 2027, and he is currently open to Forward Deployed Engineer roles
based in Newark NJ, in the New York metropolitan area, or remote. He is also willing
to relocate anywhere in the United States for the right role.

## vitopia-scope
source: https://www.linkedin.com/in/vineetv2 | LinkedIn
As Head of Sponsorship and a core team member for VITOPIA, VIT-AP University's
flagship festival (Jan–Feb 2024), Vineet led a 20-person team through outreach to
more than 450 companies for corporate sponsorship.

## vitopia-results
source: https://www.linkedin.com/in/vineetv2 | LinkedIn
Vineet's VITOPIA sponsorship effort closed $180,000 (₹1.5 crore) in corporate
sponsorship, exceeding every revenue target set for the event.

## vitopia-stakeholder-mgmt
source: https://www.linkedin.com/in/vineetv2 | LinkedIn
On VITOPIA, Vineet owned the commercial relationships end to end — pipeline, pitch,
negotiation, and partner management — almost entirely with non-technical
stakeholders. He also sat on the core committee handling event logistics: vendors,
venue, and scheduling.

## beat-the-heat-overview
source: https://www.linkedin.com/in/vineetv2 | LinkedIn
At Beat The Heat, a VIT-AP student club, Vineet served for two and a half years (Aug
2022 – Jan 2025) across two roles: first as Head of Finance, then as Club
Administrator.

## beat-the-heat-finance
source: https://www.linkedin.com/in/vineetv2 | LinkedIn
As Head of Finance for Beat The Heat, Vineet owned the club's annual budget and
negotiated supplier contracts, building the financial plan the committee used to
decide what the club could afford to take on.
