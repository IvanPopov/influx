#pragma once

#include "timeline.h"

using namespace std;
using namespace std::chrono;

TIMELINE::TIMELINE()
{
    m_constants["elapsedTime"] = 0.f;
    m_constants["elapsedTimeLevel"] = 0.f;
}

void TIMELINE::tick()
{
    if (!m_active) {
        return;
    }

    auto now = duration_cast< ms >(system_clock::now().time_since_epoch());
    auto dt = now - m_startTime;
    m_constants["elapsedTime"] = duration<float>(dt - m_elapsedTimeLevel).count();
    m_constants["elapsedTimeLevel"] = duration<float>(m_elapsedTimeLevel).count();
    m_elapsedTimeLevel = dt; 
}

bool TIMELINE::isStopped() const 
{
    return !m_active;
}

void TIMELINE::start()
{
    m_constants["elapsedTime"] = 0.f;
    m_constants["elapsedTimeLevel"] = 0.f;

    m_startTime = duration_cast< ms >(system_clock::now().time_since_epoch());
    m_elapsedTimeLevel = ms::zero();
    m_active = true;
    cout << "emitter started" << endl;
}

void TIMELINE::stop() 
{
    m_active = false;
    cout << "emitter stopped" << endl;
}
