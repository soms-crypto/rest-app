import { useEffect, useRef, useState } from 'react'
import './App.css'

const FALLBACK_CONTENT = {
  project_name: '퇴근 5분 전',
  subtitle: '선생님에서 나로 돌아오는 작은 시간',
  inputs: {
    moods: [
      { id: 'talked_all_day', label: '하루 종일 말했어요', group: 'drained' },
      { id: 'held_back', label: '내 감정을 많이 참았어요', group: 'drained' },
      { id: 'hurt', label: '누군가에게 서운했어요', group: 'drained' },
      { id: 'exhausted', label: '그냥 지쳤어요', group: 'drained' },
      { id: 'work_piling', label: '일이 해도 해도 쌓여요', group: 'drained' },
      { id: 'ordinary', label: '그냥 평범한 하루였어요', group: 'ordinary' },
      { id: 'event_done', label: '행사가 드디어 끝났어요', group: 'bright' },
      { id: 'kids_smile', label: '아이들 덕분에 웃었어요', group: 'bright' },
      { id: 'colleague_energy', label: '동료와 함께 해서 에너지를 얻었어요', group: 'bright' },
      { id: 'window_view', label: '창밖이 정말 아름다운 날이에요', group: 'bright' },
    ],
    mood_groups: [
      { id: 'drained', label: '지친 날' },
      { id: 'ordinary', label: '평범한 날' },
      { id: 'bright', label: '좋은 날' },
    ],
    mood_selection: { skip_label: '잘 모르겠어요' },
    time_budgets_minutes: [5, 15, 30],
    default_time_budget_minutes: 5,
    time_label: '오늘 나에게 쓸 수 있는 시간',
    time_note: '앱을 쓰는 시간이 아니라 활동 시간입니다. 장소까지 이동하는 시간은 별도예요.',
  },
  ui_copy: {
    title: '퇴근 5분 전',
    intro: '오늘의 선생님 역할은 잠깐 내려놓고',
    question: '오늘은 어떤 하루였나요?',
    submit: '나를 위한 추천 보기',
    reroll: '다른 추천 보기',
    more_moods: '다른 상태 보기',
    rest: '그냥 쉴래요',
    rest_message: '좋아요. 아무것도 더하지 않는 저녁도 내 선택이에요.',
    rest_exit: '이제 이 화면을 닫아도 좋아요.',
    liked: '좋았어요',
    liked_active: '좋았어요 저장됨',
    saved_label: '좋았던 활동',
    saved_note: '활동 번호만 이 브라우저에 저장돼요. 공용 PC에서는 저장하지 않거나, 이용 후 지워주세요.',
    delete: '저장한 활동 모두 지우기',
    delete_confirm: '이 브라우저에 저장한 활동을 모두 지울까요?',
    storage_error: '이 브라우저에는 저장하지 못했어요. 추천은 계속 볼 수 있어요.',
    place_heading: '대전의 예시 장소',
    place_note: '가까울 때만 들러보세요. 이동 시간은 별도이며 방문 전 운영 안내를 확인해 주세요.',
    place_checked_label: '정보 확인일',
    footer_notice: '이 앱은 쉼을 위한 작은 제안이며 상담이나 진단을 대신하지 않아요. 마음이 많이 힘들다면 가까운 사람이나 전문 상담에 도움을 요청해 주세요.',
  },
  activity_defaults: {
    cost_note: '새 구매 없이, 이미 가진 물건과 이용 중인 서비스를 기준으로 한 제안입니다. 이동·주차·별도 시설 비용은 포함하지 않습니다.',
    setting_meaning: { home: '이동 없이 있는 자리(집 등)', outdoor: '가까운 야외', indoor_away: '가까운 실내 시설' },
  },
  recommendation_rules: {
    weights: { direct_mood_match: 3, any: 1 },
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
    { id: 'q32', mood_tags: ['any'], text: '무엇을 골라도, 아무것도 고르지 않아도 내 저녁이에요.', enabled: true },
  ],
  activities: [
    { id: 'a01', title: '등받이에 기대어 잠깐', category: 'pause', minutes: 5, mood_tags: ['any'], setting: 'home', body: '등받이가 있는 편한 자리에 앉아 잠깐 기대어 보세요.', materials: '편한 자리', place_ids: [], home_alternative_id: null, enabled: true },
    { id: 'a02', title: '좋아하는 노래 한 곡', category: 'enjoy', minutes: 5, mood_tags: ['any'], setting: 'home', body: '좋아하는 노래 한 곡을 천천히 들어보세요.', materials: '음악', place_ids: [], home_alternative_id: null, enabled: true },
    { id: 'a03', title: '창밖에 잠깐 시선 두기', category: 'refresh', minutes: 5, mood_tags: ['any'], setting: 'home', body: '창밖으로 시선을 두고 잠깐 쉬어보세요.', materials: '창밖 풍경', place_ids: [], home_alternative_id: null, enabled: true },
  ],
  places: [],
}

function chooseRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function chooseWeighted(items, mood, weights) {
  const weightedItems = items.map((item) => ({
    item,
    weight: mood && item.mood_tags.includes(mood)
      ? weights.direct_mood_match
      : weights.any,
  }))
  const totalWeight = weightedItems.reduce((total, entry) => total + entry.weight, 0)
  let randomWeight = Math.random() * totalWeight

  for (const entry of weightedItems) {
    randomWeight -= entry.weight
    if (randomWeight < 0) return entry.item
  }

  return weightedItems.at(-1)?.item
}

function createRecommendations(content, mood, minutes, excludedIds = new Set()) {
  const rules = content.recommendation_rules

  function selectActivities(excluded) {
    const selected = []
    let awayCount = 0

    for (const category of rules.categories) {
      const isEligible = (activity) => {
        const matchesMood = mood
          ? activity.mood_tags.includes(mood) || activity.mood_tags.includes('any')
          : activity.mood_tags.includes('any')
        const isAway = activity.setting !== 'home'
        return activity.enabled
          && activity.category === category.id
          && activity.minutes <= minutes
          && matchesMood
          && !excluded.has(activity.id)
          && !selected.some((item) => item.id === activity.id)
          && (!isAway || awayCount < rules.max_away_cards)
      }
      const candidates = content.activities.filter(isEligible)
      const fallback = content.activities.find((activity) => (
        activity.id === rules.fallback_by_category[category.id] && isEligible(activity)
      ))
      const chosen = chooseWeighted(candidates, mood, rules.weights) || fallback

      if (chosen) {
        selected.push(chosen)
        if (chosen.setting !== 'home') awayCount += 1
      }
    }

    return selected.slice(0, rules.card_count)
  }

  let activities = selectActivities(excludedIds)
  const resetExcluded = excludedIds.size > 0 && activities.length < rules.card_count
  if (resetExcluded) activities = selectActivities(new Set())

  const phrases = content.phrases.filter((phrase) => (
    phrase.enabled && (mood ? phrase.mood_tags.includes(mood) : phrase.mood_tags.includes('any'))
  ))

  return { activities, phrase: chooseRandom(phrases)?.text, resetExcluded }
}

function readSavedIds(activities) {
  const storageKey = 'after-five:likes:v1'
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return []

  try {
    const value = JSON.parse(stored)
    if (value.version !== 1 || !Array.isArray(value.activity_ids)) {
      window.localStorage.removeItem(storageKey)
      return []
    }
    const knownIds = new Set(activities.map((activity) => activity.id))
    const validIds = [...new Set(value.activity_ids.filter((id) => knownIds.has(id)))]
    if (validIds.length !== value.activity_ids.length) {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, activity_ids: validIds }))
    }
    return validIds
  } catch {
    window.localStorage.removeItem(storageKey)
    return []
  }
}

function App() {
  const [content, setContent] = useState(FALLBACK_CONTENT)
  const [mood, setMood] = useState(null)
  const [activeMoodGroup, setActiveMoodGroup] = useState(FALLBACK_CONTENT.inputs.mood_groups[0].id)
  const [minutes, setMinutes] = useState(FALLBACK_CONTENT.inputs.default_time_budget_minutes)
  const [recommendation, setRecommendation] = useState(() => createRecommendations(FALLBACK_CONTENT, null, 5))
  const [view, setView] = useState('recommendations')
  const [likedIds, setLikedIds] = useState([])
  const [notice, setNotice] = useState('')
  const seenIds = useRef(new Set(['a01', 'a02', 'a03']))

  useEffect(() => {
    let active = true
    fetch('/after-five-content.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Content request failed: ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (!active) return
        const defaultMinutes = data.inputs.time_budgets_minutes.includes(data.inputs.default_time_budget_minutes)
          ? data.inputs.default_time_budget_minutes
          : data.inputs.time_budgets_minutes[0]
        const initialRecommendation = createRecommendations(data, null, defaultMinutes)
        setContent(data)
        setActiveMoodGroup(data.inputs.mood_groups[0].id)
        setMinutes(defaultMinutes)
        setRecommendation(initialRecommendation)
        initialRecommendation.activities.forEach((activity) => seenIds.current.add(activity.id))
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
  const visibleMoods = content.inputs.moods.filter((item) => item.group === activeMoodGroup)

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
    const next = createRecommendations(
      content,
      mood,
      minutes,
      seenIds.current,
    )
    if (next.resetExcluded) seenIds.current.clear()
    next.activities.forEach((activity) => seenIds.current.add(activity.id))
    setRecommendation(next)
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
              <div className="choice-grid mood-group-grid">
                {content.inputs.mood_groups.map((group) => (
                  <button
                    className={`choice-button ${activeMoodGroup === group.id ? 'selected' : ''}`}
                    key={group.id}
                    onClick={() => setActiveMoodGroup(group.id)}
                    type="button"
                    aria-pressed={activeMoodGroup === group.id}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              <div className="choice-grid mood-grid">
                {visibleMoods.map((item) => (
                  <button
                    className={`choice-button ${mood === item.id ? 'selected' : ''}`}
                    key={item.id}
                    onClick={() => {
                      setMood(item.id)
                      setActiveMoodGroup(item.group)
                    }}
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
                <button className="text-button" onClick={handleRecommend} type="button">
                  {copy.reroll}
                </button>
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
      <p className="footer-notice">{copy.footer_notice}</p>
      {notice && <p className="notice" role="status">{notice}</p>}
    </main>
  )
}

function ActivityCard({ activity, content, isLiked, onLike, onHomeAlternative }) {
  const [todayString, setTodayString] = useState('')
  const category = content.recommendation_rules.categories.find((item) => item.id === activity.category)
  const places = content.places
    .filter((place) => activity.place_ids?.includes(place.id) && place.enabled)
    .slice(0, 3)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const today = new Date()
      setTodayString(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

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
          <p><strong>장소</strong>{content.activity_defaults.setting_meaning[activity.setting] || activity.setting}</p>
          {activity.materials && <p><strong>준비물</strong>{activity.materials}</p>}
          <p><strong>비용</strong>{activity.cost_note || content.activity_defaults.cost_note}</p>
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
                  <span>{place.area}</span>
                  <span>{place.address}</span>
                  <span>{place.hours_note}</span>
                  <span>{place.fee_note}</span>
                  <span>{place.availability_note}</span>
                  {place.editorial_suggestion && <span>{place.editorial_suggestion}</span>}
                  <span>{content.ui_copy.place_checked_label}: {place.checked_at}</span>
                  {(place.temporary_notices || [])
                    .filter((noticeItem) => todayString && noticeItem.valid_until >= todayString)
                    .map((noticeItem) => (
                      <span key={`${place.id}-${noticeItem.valid_until}`}>{noticeItem.text}</span>
                    ))}
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
