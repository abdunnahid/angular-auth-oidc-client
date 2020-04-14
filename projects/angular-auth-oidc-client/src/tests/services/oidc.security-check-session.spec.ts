import { async, TestBed } from '@angular/core/testing';
import { ConfigurationProvider } from '../../lib/config';
import { IFrameService } from '../../lib/services/existing-iframe.service';
import { LoggerService } from '../../lib/services/oidc.logger.service';
import { OidcSecurityCheckSession } from '../../lib/services/oidc.security.check-session';
import { OidcSecurityCommon } from '../../lib/services/oidc.security.common';
import { OidcSecurityService } from '../../lib/services/oidc.security.service';
import { OidcSecurityStorage } from '../../lib/services/oidc.security.storage';
import { TestLogging } from '../common/test-logging.service';
import { TestStorage } from '../common/test-storage.service';

describe('SecurityCheckSessionTests', () => {
    let oidcSecurityCheckSession: OidcSecurityCheckSession;
    let loggerService: LoggerService;
    let configurationProvider: ConfigurationProvider;
    let iFrameService: IFrameService;
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                OidcSecurityCheckSession,
                ConfigurationProvider,
                OidcSecurityCommon,
                { provide: LoggerService, useClass: TestLogging },
                OidcSecurityService,
                { provide: OidcSecurityStorage, useClass: TestStorage },
                IFrameService,
            ],
        });
    });

    beforeEach(() => {
        oidcSecurityCheckSession = TestBed.inject(OidcSecurityCheckSession);
        configurationProvider = TestBed.inject(ConfigurationProvider);
        loggerService = TestBed.inject(LoggerService);
        iFrameService = TestBed.inject(IFrameService);
    });

    afterEach(() => {
        const iFrameIdwhichshouldneverexist = window.document.getElementById('idwhichshouldneverexist');
        if (iFrameIdwhichshouldneverexist) {
            iFrameIdwhichshouldneverexist.parentNode.removeChild(iFrameIdwhichshouldneverexist);
        }
        const myiFrameForCheckSession = window.document.getElementById('myiFrameForCheckSession');
        if (myiFrameForCheckSession) {
            myiFrameForCheckSession.parentNode.removeChild(myiFrameForCheckSession);
        }
    });

    it('should create', () => {
        expect(oidcSecurityCheckSession).toBeTruthy();
    });

    it('doesSessionExist returns false if nothing is setup', () => {
        const result = (oidcSecurityCheckSession as any).doesSessionExist();
        expect(result).toBe(false);
    });

    it('doesSessionExist returns true if document found on window.parent.document', () => {
        iFrameService.addIFrameToWindowBody('myiFrameForCheckSession');

        const result = (oidcSecurityCheckSession as any).doesSessionExist();
        expect(result).toBe(true);
    });

    it('doesSessionExist returns true if document found on window.document', () => {
        iFrameService.addIFrameToWindowBody('myiFrameForCheckSession');

        const result = (oidcSecurityCheckSession as any).doesSessionExist();
        expect(result).toBe(true);
    });

    it('doesSessionExist returns false if document not found on window.parent.document given the wrong id', () => {
        iFrameService.addIFrameToWindowBody('idwhichshouldneverexist');
        const result = (oidcSecurityCheckSession as any).doesSessionExist();
        expect(result).toBe(false);
    });

    it('doesSessionExist returns false if document not found on window.document given the wrong id', () => {
        iFrameService.addIFrameToWindowBody('idwhichshouldneverexist');
        const result = (oidcSecurityCheckSession as any).doesSessionExist();
        expect(result).toBe(false);
    });

    it('existsParent is set when document was found on window.parent', () => {
        const node = iFrameService.addIFrameToWindowBody('myiFrameForCheckSession');

        (oidcSecurityCheckSession as any).doesSessionExist();
        expect((oidcSecurityCheckSession as any).sessionIframe).toBeTruthy();
        expect((oidcSecurityCheckSession as any).sessionIframe).toEqual(node);
    });

    it('existsParent is set when document was found on window', () => {
        const node = iFrameService.addIFrameToWindowBody('myiFrameForCheckSession');

        (oidcSecurityCheckSession as any).doesSessionExist();
        expect((oidcSecurityCheckSession as any).sessionIframe).toBeTruthy();
        expect((oidcSecurityCheckSession as any).sessionIframe).toEqual(node);
    });

    it('init appends iframe on body with correct values', () => {
        expect((oidcSecurityCheckSession as any).sessionIframe).toBeFalsy();

        (oidcSecurityCheckSession as any).init();
        spyOn<any>(loggerService, 'logDebug').and.callFake(() => {});

        expect((oidcSecurityCheckSession as any).sessionIframe).toBeTruthy();
        const sessionIframe = (oidcSecurityCheckSession as any).sessionIframe;
        expect(sessionIframe.id).toBe('myiFrameForCheckSession');
        expect(sessionIframe.style.display).toBe('none');
        const iFrame = document.getElementById('myiFrameForCheckSession');
        expect(iFrame).toBeDefined();
    });

    it('location of iframe is set to authWellKnownEndpoints.check_session_iframe if existing', async(() => {
        const authWellKnownEndpoints = {
            checkSessionIframe: 'someTestingValue',
        };

        configurationProvider.setConfig(null, authWellKnownEndpoints);
        spyOn<any>(loggerService, 'logDebug').and.callFake(() => {});

        expect((oidcSecurityCheckSession as any).sessionIframe).toBeFalsy();

        const loaded = (oidcSecurityCheckSession as any).init();

        loaded.subscribe(() => {
            expect((oidcSecurityCheckSession as any).sessionIframe).toBeTruthy();
            expect((oidcSecurityCheckSession as any).sessionIframe.contentWindow.location.toString()).toContain('someTestingValue');
        });
    }));

    it('log warning if authWellKnownEndpoints.check_session_iframe is not existing', () => {
        const spy = spyOn<any>(oidcSecurityCheckSession, 'doesSessionExist').and.returnValue(false);
        const spyLogWarning = spyOn<any>(loggerService, 'logWarning');
        spyOn<any>(loggerService, 'logDebug').and.callFake(() => {});
        configurationProvider.setConfig(null, { checkSessionIframe: undefined });
        (oidcSecurityCheckSession as any).init();

        expect(spy).toHaveBeenCalled();
        expect(spyLogWarning).toHaveBeenCalledWith('init check session: authWellKnownEndpoints is undefined');
    });

    it('startCheckingSession calls pollserversession with clientId if no scheduledheartbeat is set', () => {
        const spy = spyOn<any>(oidcSecurityCheckSession, 'pollServerSession');
        oidcSecurityCheckSession.startCheckingSession('anyId');
        expect(spy).toHaveBeenCalledWith('anyId');
    });

    it('startCheckingSession does not call pollserversession if scheduledheartbeat is set', () => {
        const spy = spyOn<any>(oidcSecurityCheckSession, 'pollServerSession');
        (oidcSecurityCheckSession as any).scheduledHeartBeat = () => {};
        oidcSecurityCheckSession.startCheckingSession('anyId');
        expect(spy).not.toHaveBeenCalled();
    });

    it('stopCheckingSession sets heartbeat to null', () => {
        (oidcSecurityCheckSession as any).scheduledHeartBeat = setTimeout(() => {}, 999);
        oidcSecurityCheckSession.stopCheckingSession();
        const heartBeat = (oidcSecurityCheckSession as any).scheduledHeartBeat;
        expect(heartBeat).toBeNull();
    });
});
