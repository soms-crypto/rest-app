import { useEffect, useState } from 'react'
import './App.css'

const FALLBACK_CONTENT = {
  project_name: '퇴근 5분 전',
  subtitle: '선생님에서 나로 돌아오는 작은 시간',
  inputs: {
    moods: [
      { id: 'tired', label: '지침' },
      { id: 'tangled', label: '복잡함' },
      { id: 'hurt', label: '서운함' },
      { id: 'empty', label: '허전함' },
      { id: 'proud', label: '뿌듯함' },
      { id: 'calm', label: '평온함' },
    ],
    mood_selection: { skip_label: '잘 모르겠어요' },
    time_budgets_minutes: [5, 15, 30],
    default_time_budget_minutes: 5,
    time_label: '오늘 나에게 쓸 수 있는 시간',
    time_note: '앱을 쓰는 시간이 아니라 활동 시간입니다. 이동 시간은 별도예요.',
  },
  ui_copy: {
    title: '퇴근 5분 전',
    intro: '오늘의 선생님 역할은 잠깐 내려놓고',
    question: '지금, 내 마음은 어떤가요?',
    submit: '나를 위한 추천 보기',
    rest: '그냥 쉴래요',
    rest_message: '좋아요. 아무것도 더하지 않는 저녁도 내 선택이에요.',
    rest_exit: '이제 이 화면을 닫아도 좋아요.',
    liked: '좋았어요',
    liked_active: '좋았어요 저장됨',
    saved_label: '좋았던 활동',
    saved_note: '활동 번호만 이 브라우저에 저장돼요. 공용 PC에서는 이용 후 지워주세요.',
    delete: '저장한 활동 모두 지우기',
    delete_confirm: '이 브라우저에 저장한 활동을 모두 지울까요?',
    storage_error: '이 브라우저에는 저장하지 못했어요. 추천은 계속 볼 수 있어요.',
    place_heading: '대전의 예시 장소',
    place_note: '가까울 때만 들러보세요. 이동 시간은 별도이며 방문 전 운영 안내를 확인해 주세요.',
  },
  recommendation_rules: {
    categories: [
      { id: 'pause', label: '가볍게 쉬기' },
      { id: 'enjoy', label: '작게 즐기기' },
      { id: 'refresh', label: '기분 환기' },
    ],
    card_count: 3,
    max_away_cards: 1,
    fallback_by_category: { pause: 'a01', enjoy: 'a02', refresh: 'a03' },
  },
  phrases: [
    { id: 'q20', mood_tags: ['any'], text: '무엇을 골라도, 아무것도 고르지 않아도 내 저녁이에요.', enabled: true },
  ],
  activities: [
    { id: 'a01', title: '등받이에 기대어 잠깐', category: 'pause', minutes: 5, mood_tags: ['any'], setting: 'home', body: '등받이가 있는 편한 자리에 앉아 잠깐 기대어 보세요.', materials: '편한 자리', place_ids: [], enabled: true },
    { id: 'a02', title: '좋아하는 노래 한 곡', category: 'enjoy', minutes: 5, mood_tags: ['any'], setting: 'home', body: '좋아하는 노래 한 곡을 천천히 들어보세요.', materials: '음악', place_ids: [], enabled: true },
    { id: 'a03', title: '창밖에 잠깐 시선 두기', category: 'refresh', minutes: 5, mood_tags: ['any'], setting: 'home', body: '창밖으로 시선을 두고 잠깐 쉬어보세요.', materials: '창밖 풍경', place_ids: [], enabled: true },
  ],
  places: [],
}

function chooseRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function createRecommendations(content, mood, minutes) {
  const rules = content.recommendation_rules
  const selected = []
  let awayCount = 0

  for (const category of rules.categories) {
    const candidates = content.activities
      .filter((activity) => {
        const matchesMood = mood
          ? activity.mood_tags.includes(mood) || activity.mood_tags.includes('any')
          : activity.mood_tags.includes('any')
        return activity.enabled && activity.category === category.id && activity.minutes <= minutes && matchesMood
      })
      .sort((a, b) => {
        const timeOrder = b.minutes - a.minutes
        if (timeOrder !== 0) return timeOrder
        const moodOrder = Number(b.mood_tags.includes(mood)) - Number(a.mood_tags.includes(mood))
        return moodOrder || a.id.localeCompare(b.id)
      })

    const activity = candidates.find((candidate) => {
      if (selected.some((item) => item.id === candidate.id)) return false
      return candidate.setting === 'home' || awayCount < rules.max_away_cards
    })
    const fallbackId = rules.fallback_by_category[category.id]
    const fallback = content.activities.find((item) => item.id === fallbackId)
    const chosen = activity || fallback

    if (chosen && !selected.some((item) => item.id === chosen.id)) {
      selected.push(chosen)
      if (chosen.setting !== 'home') awayCount += 1
    }
  }

  const phrases = content.phrases.filter((phrase) => (
    phrase.enabled && (mood ? phrase.mood_tags.includes(mood) : phrase.mood_tags.includes('any'))
  ))

  return { activities: selected.slice(0, rules.card_count), phrase: chooseRandom(phrases)?.text }
}

function readSavedIds(activities) {
  const stored = window.localStorage.getItem('after-five:likes:v1')
  if (!stored) return []

  try {
    const value = JSON.parse(stored)
    if (value.version !== 1 || !Array.isArray(value.activity_ids)) {
      window.localStorage.removeItem('after-five:likes:v1')
      return []
    }
    const knownIds = new Set(activities.map((activity) => activity.id))
    const validIds = [...new Set(value.activity_ids.filter((id) => knownIds.has(id)))]
    if (validIds.length !== value.activity_ids.length) {
      window.localStorage.setItem('after-five:likes:v1', JSON.stringify({ version: 1, activity_ids: validIds }))
    }
    return validIds
  } catch {
    window.localStorage.removeItem('after-five:likes:v1')
    return []
  }
}

function App() {
  const [content, setContent] = useState(FALLBACK_CONTENT)
  const [mood, setMood] = useState('tired')
  const [minutes, setMinutes] = useState(5)
  const [recommendation, setRecommendation] = useState(() => createRecommendations(FALLBACK_CONTENT, 'tired', 5))
  const [view, setView] = useState('recommendations')
  const [likedIds, setLikedIds] = useState([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    fetch('/after-five-content.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Content request failed: ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (!active) return
        setContent(data)
        setRecommendation(createRecommendations(data, 'tired', 5))
        try {
          setLikedIds(readSavedIds(data.activities))
        } catch {
          setNotice(data.ui_copy.storage_error)
        }
      })
      .catch((error) => {
        console.error('Could not load recommendation content.', error)
      })

    return () => {
      active = false
    }
  }, [])

  const copy = content.ui_copy
  const savedActivities = content.activities.filter((activity) => likedIds.includes(activity.id))

  function updateLikes(nextIds) {
    setLikedIds(nextIds)
    try {
      window.localStorage.setItem(
        'after-five:likes:v1',
        JSON.stringify({ version: 1, activity_ids: nextIds }),
      )
      setNotice('')
    } catch {
      setNotice(copy.storage_error)
    }
  }

  function toggleLike(activityId) {
    const nextIds = likedIds.includes(activityId)
      ? likedIds.filter((id) => id !== activityId)
      : [...likedIds, activityId]
    updateLikes(nextIds)
  }

  function replaceWithHomeAlternative(activity) {
    const alternative = content.activities.find((item) => item.id === activity.home_alternative_id)
    if (!alternative) return
    const isDuplicate = recommendation.activities.some(
      (item) => item.id === alternative.id && item.id !== activity.id,
    )
    const replacement = isDuplicate
      ? content.activities.find((item) => item.id === content.recommendation_rules.fallback_by_category[activity.category])
      : alternative

    setRecommendation((current) => ({
      ...current,
      activities: current.activities.map((item) => item.id === activity.id ? replacement : item),
    }))
  }

  function clearLikes() {
    if (!window.confirm(copy.delete_confirm)) return
    updateLikes([])
    setView('recommendations')
  }

  function handleRecommend() {
    setRecommendation(createRecommendations(content, mood, minutes))
    setView('recommendations')
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <h1>{content.project_name}</h1>
        <p>{content.subtitle}</p>
      </header>

      <div className="workspace">
        <section className="panel input-panel" aria-labelledby="input-heading">
          <h2 id="input-heading" className="section-heading"><span>01</span> 마음과 시간</h2>
          <div className="panel-card">
            <p className="eyebrow">{copy.title}</p>
            <p className="intro">{copy.intro}</p>
            <fieldset>
              <legend>{copy.question}</legend>
              <div className="choice-grid mood-grid">
                {content.inputs.moods.map((item) => (
                  <button
                    className={`choice-button ${mood === item.id ? 'selected' : ''}`}
                    key={item.id}
                    onClick={() => setMood(item.id)}
                    type="button"
                    aria-pressed={mood === item.id}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                className={`skip-mood ${mood === null ? 'chosen' : ''}`}
                onClick={() => setMood(null)}
                type="button"
                aria-pressed={mood === null}
              >
                {content.inputs.mood_selection.skip_label}
              </button>
            </fieldset>

            <fieldset className="time-fieldset">
              <legend>{content.inputs.time_label}</legend>
              <div className="choice-grid time-grid">
                {content.inputs.time_budgets_minutes.map((budget) => (
                  <button
                    className={`choice-button ${minutes === budget ? 'selected' : ''}`}
                    key={budget}
                    onClick={() => setMinutes(budget)}
                    type="button"
                    aria-pressed={minutes === budget}
                  >
                    {budget}분
                  </button>
                ))}
              </div>
              <p className="field-note">{content.inputs.time_note}</p>
            </fieldset>
            <button className="primary-button" onClick={handleRecommend} type="button">
              {copy.submit}
            </button>
            <button className="secondary-button" onClick={() => setView('rest')} type="button">
              {copy.rest}
            </button>
          </div>
        </section>

        <section className="panel recommendation-panel" aria-labelledby="recommendation-heading">
          <h2 id="recommendation-heading" className="section-heading"><span>02</span> 추천과 선택</h2>
          <div className="panel-card result-card">
            <div className="result-header">
              <p className="eyebrow">
                {view === 'saved'
                  ? copy.saved_label
                  : view === 'rest'
                    ? copy.rest
                    : `${content.inputs.moods.find((item) => item.id === mood)?.label || content.inputs.mood_selection.skip_label} · ${minutes}분`}
              </p>
              {view === 'recommendations' && (
                <button className="text-button" onClick={handleRecommend} type="button">다시 선택</button>
              )}
              {view !== 'recommendations' && (
                <button className="text-button" onClick={() => setView('recommendations')} type="button">추천 보기</button>
              )}
            </div>

            {view === 'rest' ? (
              <div className="rest-message">
                <p>{copy.rest_message}</p>
                <span>{copy.rest_exit}</span>
              </div>
            ) : view === 'saved' ? (
              <div className="saved-view">
                <p className="result-phrase">{copy.saved_note}</p>
                {savedActivities.length === 0 ? (
                  <p className="empty-state">아직 저장한 활동이 없어요.</p>
                ) : (
                  <div className="activity-list">
                    {savedActivities.map((activity) => (
                      <ActivityCard
                        activity={activity}
                        content={content}
                        key={activity.id}
                        isLiked
                        onLike={toggleLike}
                        onHomeAlternative={replaceWithHomeAlternative}
                      />
                    ))}
                  </div>
                )}
                <button className="secondary-button clear-button" onClick={clearLikes} type="button">
                  {copy.delete}
                </button>
              </div>
            ) : (
              <>
                <p className="result-phrase">{recommendation.phrase}</p>
                <p className="encouragement">하나만 골라도, 그냥 쉬어도 좋아요.</p>
                <div className="activity-list">
                  {recommendation.activities.map((activity) => (
                    <ActivityCard
                      activity={activity}
                      content={content}
                      isLiked={likedIds.includes(activity.id)}
                      key={activity.id}
                      onLike={toggleLike}
                      onHomeAlternative={replaceWithHomeAlternative}
                    />
                  ))}
                </div>
                <button className="secondary-button result-rest-button" onClick={() => setView('rest')} type="button">
                  {copy.rest}
                </button>
                <button className="text-button saved-link" onClick={() => setView('saved')} type="button">
                  {copy.saved_label} 보기{savedActivities.length > 0 ? ` (${savedActivities.length})` : ''}
                </button>
              </>
            )}
          </div>
        </section>
      </div>

      <p className="page-note">
        <strong>‘{copy.rest}’를 누르면</strong>
        <span>{copy.rest_message}</span>
        <span>{copy.rest_exit}</span>
      </p>
      {notice && <p className="notice" role="status">{notice}</p>}
    </main>
  )
}

function ActivityCard({ activity, content, isLiked, onLike, onHomeAlternative }) {
  const category = content.recommendation_rules.categories.find((item) => item.id === activity.category)
  const places = content.places.filter((place) => activity.place_ids?.includes(place.id) && place.enabled).slice(0, 3)

  return (
    <article className="activity-card">
      <div className="activity-card-top">
        <p>{category?.label || '오늘의 활동'} · {activity.minutes}분</p>
        <button
          className={`like-button ${isLiked ? 'liked' : ''}`}
          onClick={() => onLike(activity.id)}
          type="button"
          aria-pressed={isLiked}
          aria-label={isLiked ? content.ui_copy.liked_active : content.ui_copy.liked}
        >
          {isLiked ? content.ui_copy.liked_active : content.ui_copy.liked}
        </button>
      </div>
      <h3>{activity.title}</h3>
      <p className="activity-body">{activity.body}</p>
      <details>
        <summary>자세히 보기</summary>
        <div className="activity-details">
          {activity.materials && <p><strong>준비물</strong>{activity.materials}</p>}
          {activity.cost_note && <p><strong>비용</strong>{activity.cost_note}</p>}
          {activity.home_alternative_id && (
            <button className="text-button home-alternative" onClick={() => onHomeAlternative(activity)} type="button">
              집에서 할래요
            </button>
          )}
          {places.length > 0 && (
            <div className="place-list">
              <strong>{content.ui_copy.place_heading}</strong>
              <p>{content.ui_copy.place_note}</p>
              {places.map((place) => (
                <div className="place-item" key={place.id}>
                  <strong>{place.name}</strong>
                  <span>{place.area} · {place.hours_note}</span>
                  <span>{place.fee_note}</span>
                  <a href={place.official_url} target="_blank" rel="noreferrer">운영 안내 보기</a>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>
    </article>
  )
}

export default App
