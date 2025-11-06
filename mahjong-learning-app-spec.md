# Mahjong Learning App - Product Specification

## 1. Product Overview

### 1.1 Vision
A comprehensive mobile learning platform that teaches users how to play mahjong from beginner to advanced levels, covering rules, scoring systems, tile meanings, and strategic gameplay across different mahjong variants.

### 1.2 Target Audience
- Complete beginners with no mahjong experience
- Casual players wanting to improve their skills
- Players familiar with one variant wanting to learn others
- International users interested in Chinese/Japanese/American mahjong

### 1.3 Platform Requirements
- iOS (minimum version: iOS 14.0+)
- Android (minimum version: Android 8.0+)
- Cross-platform framework recommendation: React Native or Flutter

---

## 2. Core Features

### 2.1 Interactive Tutorial System

#### 2.1.1 Tile Recognition Module
- **Suits Overview**: Bamboo (索子), Characters (萬子), Dots (筒子)
- **Honor Tiles**: Winds (東南西北), Dragons (中發白)
- **Interactive Flashcards**: Tap to flip, swipe for next tile
- **Quiz Mode**: Identify tiles by name/symbol
- **3D Tile Viewer**: Rotate and examine tiles from all angles

#### 2.1.2 Progressive Learning Path
- **Level 1**: Basic tile identification
- **Level 2**: Understanding suits and sets (Pung, Kong, Chow)
- **Level 3**: Hand combinations and winning patterns
- **Level 4**: Scoring fundamentals
- **Level 5**: Advanced scoring and special hands
- **Level 6**: Strategic gameplay and decision-making

#### 2.1.3 Rule Variants
- Chinese Classical Mahjong
- Hong Kong Mahjong
- Japanese Riichi Mahjong
- American Mahjong
- Singaporean Mahjong
- Allow users to select their preferred variant for focused learning

### 2.2 Scoring System Education

#### 2.2.1 Score Calculator
- Interactive tool to input hand combinations
- Real-time score calculation with explanations
- Breakdown of fan/fu/points for each element
- Support for all major scoring systems

#### 2.2.2 Scoring Scenarios
- Pre-built example hands with detailed breakdowns
- "What's my score?" practice problems
- Common scoring mistakes and corrections
- Special hands (limit hands) encyclopedia

### 2.3 Gameplay Simulation

#### 2.3.1 Practice Mode
- Play against AI opponents at various difficulty levels
- Pause and get hints during gameplay
- Rewind and review previous turns
- Highlight valid moves and explain why others aren't valid

#### 2.3.2 Guided Scenarios
- Specific game situations with learning objectives
- "What would you do?" decision points
- Explanation of optimal plays
- Common beginner mistakes demonstrations

### 2.4 Reference Library

#### 2.4.1 Comprehensive Rule Book
- Searchable database of all rules
- Region-specific rule variations
- Illustrated examples for each rule
- Glossary of mahjong terminology (multilingual)

#### 2.4.2 Hand Patterns Gallery
- Visual catalog of all valid winning hands
- Sorting by: difficulty, point value, frequency
- Special/rare hand showcase
- Pattern recognition drills

### 2.5 Progress Tracking

#### 2.5.1 Learning Analytics
- Completion percentage for each module
- Strengths and weaknesses analysis
- Time spent learning each concept
- Quiz scores and improvement trends

#### 2.5.2 Achievement System
- Badges for completing learning modules
- Milestone celebrations (first win, perfect scoring quiz, etc.)
- Daily/weekly learning streaks
- Leaderboards (optional, for competitive learners)

---

## 3. User Interface Design

### 3.1 Navigation Structure
```
Home Screen
├── Learn
│   ├── Getting Started
│   ├── Tiles & Symbols
│   ├── Basic Rules
│   ├── Scoring System
│   └── Advanced Strategies
├── Practice
│   ├── Play vs AI
│   ├── Guided Scenarios
│   └── Quick Match
├── Reference
│   ├── Rule Book
│   ├── Hand Patterns
│   ├── Scoring Calculator
│   └── Glossary
├── Progress
│   ├── My Stats
│   ├── Achievements
│   └── Learning Path
└── Settings
    ├── Mahjong Variant
    ├── Language
    ├── Notifications
    └── Account
```

### 3.2 Design Principles
- Clean, uncluttered interface focusing on learning content
- High contrast for tile visibility
- Consistent color coding for tile types
- Responsive design for both phones and tablets
- Portrait and landscape orientation support
- Accessibility features (colorblind mode, text-to-speech)

### 3.3 Visual Style
- Authentic mahjong aesthetic with modern UX
- Traditional tile designs with clear, readable symbols
- Green felt table background for practice mode
- Warm, inviting color palette
- Smooth animations for tile movements
- Sound effects (optional, can be muted)

---

## 4. Technical Architecture

### 4.1 Frontend
- **Framework**: React Native or Flutter
- **State Management**: Redux (React Native) or Provider (Flutter)
- **UI Components**: Custom mahjong tile renderer
- **Animation Library**: Reanimated 2 or Flutter's built-in animations
- **Asset Management**: SVG for tile designs (scalability)

### 4.2 Backend
- **Database**: Firebase Firestore or Supabase for user data
- **Authentication**: Firebase Auth or Auth0
- **Cloud Functions**: For AI opponent logic and score validation
- **Analytics**: Firebase Analytics or Mixpanel
- **Crash Reporting**: Sentry or Firebase Crashlytics

### 4.3 AI Opponent
- Rule-based AI for beginner/intermediate levels
- Monte Carlo tree search or neural network for advanced AI
- Adjustable difficulty with transparent skill indicators
- Explanations for AI moves (teaching mode)

### 4.4 Offline Capability
- All learning content available offline
- Offline practice mode against local AI
- Sync progress when back online
- Download content packs by variant

---

## 5. Content Requirements

### 5.1 Educational Content
- 50+ video tutorials (2-5 minutes each)
- 200+ practice scenarios
- 100+ quiz questions per module
- Comprehensive written guides for each concept
- Infographics for complex scoring rules

### 5.2 Localization
- **Primary Languages**: English, Chinese (Simplified/Traditional), Japanese
- **Secondary Languages**: Spanish, Korean, Vietnamese
- Support for right-to-left and vertical text where culturally appropriate
- Cultural notes for region-specific variations

### 5.3 Multimedia Assets
- 3D models or high-quality images of all 144 tiles
- Table and gameplay environment assets
- UI icons and buttons
- Sound effects (tile clicking, shuffle, win/lose)
- Background music (optional, subtle, can be disabled)

---

## 6. Monetization Strategy

### 6.1 Freemium Model
**Free Tier**:
- Complete beginner content (Levels 1-3)
- One mahjong variant (user's choice)
- Basic practice mode
- Limited AI difficulty levels
- Ads (non-intrusive, skippable)

**Premium Tier** (one-time purchase or subscription):
- All learning content (Levels 1-6)
- All mahjong variants
- Advanced practice scenarios
- Full AI difficulty range
- Scoring calculator advanced features
- Ad-free experience
- Priority customer support
- Early access to new content

### 6.2 Additional Revenue Streams
- In-app purchases for specific variant packs
- Cosmetic tile set themes
- Advanced analytics reports

---

## 7. Development Phases

### Phase 1: MVP (3-4 months)
- Core tile learning module
- One complete mahjong variant (Hong Kong or Riichi)
- Basic practice mode with simple AI
- Fundamental scoring education
- User authentication and basic progress tracking

### Phase 2: Content Expansion (2-3 months)
- Add 2-3 additional mahjong variants
- Complete all learning modules (Levels 1-6)
- Enhanced practice scenarios
- Reference library implementation
- Achievement system

### Phase 3: Polish & Advanced Features (2-3 months)
- Advanced AI opponent
- Scoring calculator
- Additional language support
- Improved animations and UX
- Performance optimization
- Comprehensive testing

### Phase 4: Launch & Iteration (ongoing)
- Beta testing with focus groups
- App Store and Google Play submission
- Marketing and user acquisition
- Community feedback integration
- Regular content updates
- Bug fixes and improvements

---

## 8. Success Metrics

### 8.1 User Engagement
- Daily Active Users (DAU) / Monthly Active Users (MAU)
- Average session duration
- Module completion rates
- Return user rate (7-day, 30-day)

### 8.2 Learning Effectiveness
- Quiz score improvements over time
- Time to complete learning path
- User confidence surveys (pre/post learning)
- Practice game win rates by skill level

### 8.3 Business Metrics
- Free-to-paid conversion rate
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- App Store ratings and reviews

---

## 9. User Stories

### 9.1 Beginner User
"As a complete beginner, I want to understand what each tile represents so that I can start learning the game."

"As a new player, I want step-by-step guidance during practice games so that I don't feel overwhelmed."

### 9.2 Intermediate User
"As an intermediate player, I want to practice specific scoring scenarios so that I can improve my point calculation skills."

"As someone who knows one variant, I want to learn the differences in other regional rules so that I can play with more people."

### 9.3 Advanced User
"As an experienced player, I want to challenge myself against difficult AI opponents so that I can refine my strategy."

"As an advanced learner, I want access to rare and complex hand patterns so that I can master all aspects of the game."

---

## 10. Risk Assessment

### 10.1 Technical Risks
- **AI complexity**: Mitigate by starting with rule-based AI, iterate to advanced algorithms
- **Cross-platform performance**: Regular testing on various devices, optimize assets
- **Offline functionality**: Careful caching strategy, incremental updates

### 10.2 Content Risks
- **Rule accuracy**: Consult with mahjong experts, community review
- **Cultural sensitivity**: Work with native speakers and cultural consultants
- **Content volume**: Prioritize core content first, expand iteratively

### 10.3 Market Risks
- **Competition**: Differentiate through superior educational approach
- **Niche audience**: Focus on underserved markets, strong ASO strategy
- **Monetization**: A/B test pricing, offer genuine value in premium tier

---

## 11. Future Enhancements

### 11.1 Social Features
- Multiplayer practice with friends
- Share progress and achievements
- Community forums or chat
- Live tournaments (virtual)

### 11.2 Advanced Tools
- Hand probability calculator
- Tile efficiency analyzer
- Game replay and analysis
- Expert commentary on famous games

### 11.3 Expanded Content
- Video lessons from professional players
- Cultural history of mahjong
- Strategy guides by experts
- Regional etiquette and customs

---

## 12. Appendix

### 12.1 Glossary
- **Chow (Chi)**: A sequence of three consecutive tiles of the same suit
- **Pung (Peng)**: Three identical tiles
- **Kong (Gang)**: Four identical tiles
- **Fan/Fu**: Scoring units in various mahjong systems
- **Riichi**: A Japanese mahjong declaration of readiness
- **Dora**: Bonus tiles in Japanese mahjong

### 12.2 Resources
- World Mahjong Organization rules
- Regional mahjong association guidelines
- Academic papers on mahjong AI
- User testing protocols

### 12.3 Legal Considerations
- Terms of Service and Privacy Policy required
- COPPA compliance (if allowing users under 13)
- GDPR compliance for European users
- App Store and Google Play guidelines adherence
- Copyright for tile designs and educational content

---

## Contact & Contribution
This specification is open for community feedback and contributions. Please submit issues or pull requests through the GitHub repository.

**Version**: 1.0  
**Last Updated**: November 2025  
**Document Owner**: [Your Name/Team]
